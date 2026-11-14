import AVFoundation
import AppKit
import CoreImage
import Foundation

/// What a virtual camera shows.
struct SimulatorCameraSource: Hashable {
  enum Kind: String {
    case none, macCamera, image, video, qr
  }
  enum ContentMode: String {
    case fit, fill
  }

  var kind: Kind
  /// `image` and `video`: the file. `qr`: the text to encode. `macCamera`: the camera's unique ID.
  var value: String?
  var contentMode: ContentMode = .fill

  init(kind: Kind, value: String? = nil, contentMode: ContentMode = .fill) {
    self.kind = kind
    self.value = value
    self.contentMode = contentMode
  }

  init?(dictionary: [String: Any]) {
    guard let kind = Kind(rawValue: dictionary["kind"] as? String ?? "") else { return nil }
    self.kind = kind
    value = dictionary["value"] as? String
    contentMode = ContentMode(rawValue: dictionary["contentMode"] as? String ?? "") ?? .fill
  }

  var dictionary: [String: Any] {
    var result: [String: Any] = ["kind": kind.rawValue, "contentMode": contentMode.rawValue]
    if let value { result["value"] = value }
    return result
  }
}

/// A frame as a source produces it.
enum SourceFrame {
  case image(CGImage)
  case pixelBuffer(CVPixelBuffer)
}

/// Produces frames for a source. `onFrame` is called whenever a new frame is available, from
/// any thread: once for still sources, at the source's rate for live ones.
protocol FrameSource: AnyObject {
  var onFrame: ((SourceFrame) -> Void)? { get set }
  func start() throws
  func stop()
}

enum FrameSourceError: LocalizedError {
  case fileNotFound(String)
  case unreadableImage(String)
  case cameraNotFound(String?)
  case cameraDenied
  case cannotEncodeQR

  var errorDescription: String? {
    switch self {
    case .fileNotFound(let path): return "File not found: \(path)"
    case .unreadableImage(let path): return "Cannot read the image \(path)"
    case .cameraNotFound(let id): return "Camera not found\(id.map { ": \($0)" } ?? "")"
    case .cameraDenied: return "Orbit has no access to the camera. Allow it in System Settings → Privacy & Security → Camera."
    case .cannotEncodeQR: return "Cannot encode the text as a QR code"
    }
  }
}

// MARK: - Factory

enum FrameSources {
  static func make(_ source: SimulatorCameraSource) throws -> FrameSource? {
    switch source.kind {
    case .none:
      return nil
    case .image:
      return try ImageFrameSource(path: source.value ?? "")
    case .video:
      return try VideoFrameSource(path: source.value ?? "")
    case .qr:
      return try QRFrameSource(text: source.value ?? "")
    case .macCamera:
      return try MacCameraFrameSource(uniqueID: source.value)
    }
  }

  static func availableMacCameras() -> [(id: String, name: String)] {
    let session = AVCaptureDevice.DiscoverySession(
      deviceTypes: [.builtInWideAngleCamera, .external], mediaType: .video, position: .unspecified)
    return session.devices.map { ($0.uniqueID, $0.localizedName) }
  }
}

// MARK: - Still image

final class ImageFrameSource: FrameSource {
  var onFrame: ((SourceFrame) -> Void)?
  private let image: CGImage

  init(path: String) throws {
    let expanded = (path as NSString).expandingTildeInPath
    guard FileManager.default.fileExists(atPath: expanded) else {
      throw FrameSourceError.fileNotFound(path)
    }
    guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: expanded) as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, [kCGImageSourceShouldCache: true] as CFDictionary)
    else {
      throw FrameSourceError.unreadableImage(path)
    }
    self.image = ImageFrameSource.applyingOrientation(of: source, to: image)
  }

  func start() throws {
    onFrame?(.image(image))
  }

  func stop() {}

  /// Photos carry their rotation in EXIF; the frame must show them upright.
  private static func applyingOrientation(of source: CGImageSource, to image: CGImage) -> CGImage {
    guard let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
      let raw = properties[kCGImagePropertyOrientation] as? UInt32,
      let orientation = CGImagePropertyOrientation(rawValue: raw), orientation != .up
    else { return image }
    let ciImage = CIImage(cgImage: image).oriented(orientation)
    let context = CIContext(options: nil)
    return context.createCGImage(ciImage, from: ciImage.extent) ?? image
  }
}

// MARK: - QR code

final class QRFrameSource: FrameSource {
  var onFrame: ((SourceFrame) -> Void)?
  private let image: CGImage

  init(text: String) throws {
    guard let filter = CIFilter(name: "CIQRCodeGenerator") else { throw FrameSourceError.cannotEncodeQR }
    filter.setValue(text.data(using: .utf8), forKey: "inputMessage")
    filter.setValue("M", forKey: "inputCorrectionLevel")
    guard let output = filter.outputImage else { throw FrameSourceError.cannotEncodeQR }
    // The generator draws one point per module; scale up without smoothing so the modules
    // stay crisp, and leave the quiet zone the generator adds.
    let scale = (720 / output.extent.height).rounded(.down)
    let scaled = output.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let context = CIContext(options: [.useSoftwareRenderer: true])
    guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else {
      throw FrameSourceError.cannotEncodeQR
    }
    image = cgImage
  }

  func start() throws {
    onFrame?(.image(image))
  }

  func stop() {}
}

// MARK: - Video file

final class VideoFrameSource: NSObject, FrameSource {
  var onFrame: ((SourceFrame) -> Void)?

  private let player: AVQueuePlayer
  private let looper: AVPlayerLooper
  private let output: AVPlayerItemVideoOutput
  private var timer: DispatchSourceTimer?
  private weak var attachedItem: AVPlayerItem?
  private let queue = DispatchQueue(label: "dev.expo.orbit.simulator-camera.video")

  init(path: String) throws {
    let expanded = (path as NSString).expandingTildeInPath
    guard FileManager.default.fileExists(atPath: expanded) else {
      throw FrameSourceError.fileNotFound(path)
    }
    let item = AVPlayerItem(url: URL(fileURLWithPath: expanded))
    output = AVPlayerItemVideoOutput(pixelBufferAttributes: [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
      kCVPixelBufferCGImageCompatibilityKey as String: true,
      kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
    ])
    player = AVQueuePlayer()
    player.isMuted = true
    looper = AVPlayerLooper(player: player, templateItem: item)
    super.init()
  }

  func start() throws {
    player.play()
    let timer = DispatchSource.makeTimerSource(queue: queue)
    timer.schedule(deadline: .now(), repeating: .milliseconds(33), leeway: .milliseconds(2))
    timer.setEventHandler { [weak self] in self?.pull() }
    timer.resume()
    self.timer = timer
  }

  func stop() {
    timer?.cancel()
    timer = nil
    player.pause()
  }

  private func pull() {
    // The looper plays copies of the template item and swaps them at the loop point; an
    // output belongs to one item at a time, so move it to the current one.
    guard let item = player.currentItem else { return }
    if attachedItem !== item {
      attachedItem?.remove(output)
      item.add(output)
      attachedItem = item
    }
    let time = output.itemTime(forHostTime: CACurrentMediaTime())
    guard output.hasNewPixelBuffer(forItemTime: time),
      let buffer = output.copyPixelBuffer(forItemTime: time, itemTimeForDisplay: nil)
    else { return }
    onFrame?(.pixelBuffer(buffer))
  }
}

// MARK: - Mac camera

final class MacCameraFrameSource: NSObject, FrameSource, AVCaptureVideoDataOutputSampleBufferDelegate {
  var onFrame: ((SourceFrame) -> Void)?

  private let session = AVCaptureSession()
  private let queue = DispatchQueue(label: "dev.expo.orbit.simulator-camera.mac-camera")
  private let device: AVCaptureDevice

  init(uniqueID: String?) throws {
    let device: AVCaptureDevice?
    if let uniqueID, !uniqueID.isEmpty {
      device = AVCaptureDevice(uniqueID: uniqueID)
    } else {
      device = AVCaptureDevice.default(for: .video)
    }
    guard let device else { throw FrameSourceError.cameraNotFound(uniqueID) }
    self.device = device
    super.init()
  }

  func start() throws {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .denied, .restricted:
      throw FrameSourceError.cameraDenied
    case .notDetermined:
      // Ask once; the frames start when the user allows. The placeholder shows until then.
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        if granted { self?.queue.async { try? self?.configureAndRun() } }
      }
      return
    default:
      break
    }
    try configureAndRun()
  }

  private func configureAndRun() throws {
    let input = try AVCaptureDeviceInput(device: device)
    let output = AVCaptureVideoDataOutput()
    output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
    output.alwaysDiscardsLateVideoFrames = true
    output.setSampleBufferDelegate(self, queue: queue)
    session.beginConfiguration()
    if session.canSetSessionPreset(.hd1280x720) { session.sessionPreset = .hd1280x720 }
    if session.canAddInput(input) { session.addInput(input) }
    if session.canAddOutput(output) { session.addOutput(output) }
    session.commitConfiguration()
    session.startRunning()
  }

  func stop() {
    session.stopRunning()
    for input in session.inputs { session.removeInput(input) }
    for output in session.outputs { session.removeOutput(output) }
  }

  func captureOutput(
    _ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection
  ) {
    guard let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    onFrame?(.pixelBuffer(buffer))
  }
}

// MARK: - Canvas

/// Draws source frames onto the fixed-size frame that goes into shared memory.
enum FrameCanvas {
  static let width = Int(ORBIT_CAMERA_MAX_WIDTH)
  static let height = Int(ORBIT_CAMERA_MAX_HEIGHT)
  static let bytesPerRow = width * 4

  /// Renders `frame` into `destination` (a BGRA buffer of `bytesPerRow` × `height` bytes).
  static func render(_ frame: SourceFrame, contentMode: SimulatorCameraSource.ContentMode, into destination: UnsafeMutableRawPointer) {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
    guard let context = CGContext(
      data: destination, width: width, height: height, bitsPerComponent: 8, bytesPerRow: bytesPerRow,
      space: colorSpace, bitmapInfo: bitmapInfo.rawValue)
    else { return }

    let image: CGImage?
    var sourceContext: CGContext?
    switch frame {
    case .image(let cgImage):
      image = cgImage
    case .pixelBuffer(let buffer):
      CVPixelBufferLockBaseAddress(buffer, .readOnly)
      defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
      guard CVPixelBufferGetPixelFormatType(buffer) == kCVPixelFormatType_32BGRA,
        let base = CVPixelBufferGetBaseAddress(buffer)
      else { return }
      sourceContext = CGContext(
        data: base, width: CVPixelBufferGetWidth(buffer), height: CVPixelBufferGetHeight(buffer),
        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: colorSpace,
        bitmapInfo: bitmapInfo.rawValue)
      image = sourceContext?.makeImage()
      draw(image, contentMode: contentMode, in: context)
      return
    }
    draw(image, contentMode: contentMode, in: context)
  }

  private static func draw(_ image: CGImage?, contentMode: SimulatorCameraSource.ContentMode, in context: CGContext) {
    context.setFillColor(red: 0, green: 0, blue: 0, alpha: 1)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    guard let image, image.width > 0, image.height > 0 else { return }
    let canvas = CGSize(width: width, height: height)
    let scaleX = canvas.width / CGFloat(image.width)
    let scaleY = canvas.height / CGFloat(image.height)
    let scale = contentMode == .fill ? max(scaleX, scaleY) : min(scaleX, scaleY)
    let size = CGSize(width: CGFloat(image.width) * scale, height: CGFloat(image.height) * scale)
    let rect = CGRect(
      x: (canvas.width - size.width) / 2, y: (canvas.height - size.height) / 2,
      width: size.width, height: size.height)
    context.interpolationQuality = .medium
    context.draw(image, in: rect)
  }
}
