import AVFoundation
import ExpoModulesCore

private let framePath = "/private/tmp/dev.expo.orbit.simulator-camera.frames"
private let frameMagic: UInt32 = 0x4f524243
private let frameVersion: UInt32 = 1
private let headerSize = 4096
private let maxWidth = 1920
private let maxHeight = 1080
private let bytesPerPixel = 4
private let slotSize = maxWidth * maxHeight * bytesPerPixel
private let fileSize = headerSize + (slotSize * 2)
private let lldbBlockStart = "# >>> Expo Orbit Simulator Camera >>>"
private let lldbBlockEnd = "# <<< Expo Orbit Simulator Camera <<<"

private final class SharedFrameWriter {
  private var descriptor: Int32 = -1
  private var memory: UnsafeMutableRawPointer?
  private var sequence: UInt64 = 0

  init() throws {
    descriptor = Darwin.open(framePath, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard descriptor >= 0 else {
      throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno))
    }
    guard ftruncate(descriptor, off_t(fileSize)) == 0 else {
      throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno))
    }
    let mapped = mmap(nil, fileSize, PROT_READ | PROT_WRITE, MAP_SHARED, descriptor, 0)
    guard mapped != MAP_FAILED else {
      throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno))
    }
    memory = mapped
  }

  deinit {
    if let memory {
      munmap(memory, fileSize)
    }
    if descriptor >= 0 {
      Darwin.close(descriptor)
    }
  }

  func write(_ pixelBuffer: CVPixelBuffer, timestamp: CMTime) {
    guard let memory else { return }
    CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

    guard let source = CVPixelBufferGetBaseAddress(pixelBuffer) else { return }
    let width = min(CVPixelBufferGetWidth(pixelBuffer), maxWidth)
    let height = min(CVPixelBufferGetHeight(pixelBuffer), maxHeight)
    let sourceBytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
    let destinationBytesPerRow = width * bytesPerPixel
    sequence &+= 1
    let activeSlot = Int(sequence % 2)

    flock(descriptor, LOCK_EX)
    defer { flock(descriptor, LOCK_UN) }

    let destination = memory.advanced(by: headerSize + (activeSlot * slotSize))
    for row in 0..<height {
      memcpy(
        destination.advanced(by: row * destinationBytesPerRow),
        source.advanced(by: row * sourceBytesPerRow),
        destinationBytesPerRow
      )
    }

    memory.storeBytes(of: frameMagic, toByteOffset: 0, as: UInt32.self)
    memory.storeBytes(of: frameVersion, toByteOffset: 4, as: UInt32.self)
    memory.storeBytes(of: sequence, toByteOffset: 8, as: UInt64.self)
    memory.storeBytes(of: UInt32(width), toByteOffset: 16, as: UInt32.self)
    memory.storeBytes(of: UInt32(height), toByteOffset: 20, as: UInt32.self)
    memory.storeBytes(of: UInt32(destinationBytesPerRow), toByteOffset: 24, as: UInt32.self)
    memory.storeBytes(of: kCVPixelFormatType_32BGRA, toByteOffset: 28, as: UInt32.self)
    memory.storeBytes(of: UInt32(slotSize), toByteOffset: 32, as: UInt32.self)
    memory.storeBytes(of: UInt32(activeSlot), toByteOffset: 36, as: UInt32.self)
    let nanoseconds = UInt64(max(0, CMTimeGetSeconds(timestamp)) * 1_000_000_000)
    memory.storeBytes(of: nanoseconds, toByteOffset: 40, as: UInt64.self)
    msync(memory, fileSize, MS_ASYNC)
  }
}

private final class CameraStreamer: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  private let session = AVCaptureSession()
  private let queue = DispatchQueue(label: "dev.expo.orbit.simulator-camera.capture")
  private var writer: SharedFrameWriter?
  private(set) var cameraName: String?
  private(set) var isStreaming = false

  func start() throws {
    guard !isStreaming else { return }
    guard let camera = AVCaptureDevice.default(for: .video) else {
      throw NSError(
        domain: "SimulatorCamera",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "No Mac camera is available."]
      )
    }

    let input = try AVCaptureDeviceInput(device: camera)
    let output = AVCaptureVideoDataOutput()
    output.alwaysDiscardsLateVideoFrames = true
    output.videoSettings = [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    ]
    output.setSampleBufferDelegate(self, queue: queue)

    session.beginConfiguration()
    session.sessionPreset = .high
    guard session.canAddInput(input), session.canAddOutput(output) else {
      session.commitConfiguration()
      throw NSError(
        domain: "SimulatorCamera",
        code: 2,
        userInfo: [NSLocalizedDescriptionKey: "The selected camera configuration is unsupported."]
      )
    }
    session.addInput(input)
    session.addOutput(output)
    session.commitConfiguration()

    writer = try SharedFrameWriter()
    cameraName = camera.localizedName
    session.startRunning()
    isStreaming = true
  }

  func stop() {
    guard isStreaming else { return }
    session.stopRunning()
    for input in session.inputs { session.removeInput(input) }
    for output in session.outputs { session.removeOutput(output) }
    writer = nil
    isStreaming = false
    try? FileManager.default.removeItem(atPath: framePath)
  }

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    writer?.write(pixelBuffer, timestamp: CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
  }
}

private enum InjectionInstaller {
  static var lldbInitURL: URL {
    let homePath = getpwuid(getuid()).map { String(cString: $0.pointee.pw_dir) }
      ?? FileManager.default.homeDirectoryForCurrentUser.path
    return URL(fileURLWithPath: homePath).appendingPathComponent(".lldbinit-Xcode")
  }

  static var supportDirectory: URL {
    FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("Expo Orbit/SimulatorCamera", isDirectory: true)
  }

  static var isInstalled: Bool {
    guard let contents = try? String(contentsOf: lldbInitURL, encoding: .utf8) else {
      return false
    }
    return contents.contains(lldbBlockStart) && contents.contains(lldbBlockEnd)
  }

  static func install() throws {
    guard let bundledDylib = Bundle.main.url(
      forResource: "OrbitSimulatorCamera",
      withExtension: "dylib"
    ) else {
      throw NSError(
        domain: "SimulatorCamera",
        code: 3,
        userInfo: [NSLocalizedDescriptionKey: "The Simulator camera injection payload is missing."]
      )
    }

    try FileManager.default.createDirectory(
      at: supportDirectory,
      withIntermediateDirectories: true
    )
    let dylibURL = supportDirectory.appendingPathComponent("OrbitSimulatorCamera.dylib")
    let scriptURL = supportDirectory.appendingPathComponent("orbit_simulator_camera.py")
    try? FileManager.default.removeItem(at: dylibURL)
    try FileManager.default.copyItem(at: bundledDylib, to: dylibURL)
    try lldbScript(dylibPath: dylibURL.path).write(to: scriptURL, atomically: true, encoding: .utf8)

    let existing = (try? String(contentsOf: lldbInitURL, encoding: .utf8)) ?? ""
    let cleaned = removingManagedBlock(from: existing)
    let block = "\(lldbBlockStart)\ncommand script import \(shellQuoted(scriptURL.path))\n\(lldbBlockEnd)\n"
    try (cleaned + (cleaned.isEmpty || cleaned.hasSuffix("\n") ? "" : "\n") + block)
      .write(to: lldbInitURL, atomically: true, encoding: .utf8)
  }

  static func uninstall() throws {
    if let existing = try? String(contentsOf: lldbInitURL, encoding: .utf8) {
      try removingManagedBlock(from: existing)
        .write(to: lldbInitURL, atomically: true, encoding: .utf8)
    }
    try? FileManager.default.removeItem(at: supportDirectory)
  }

  private static func removingManagedBlock(from contents: String) -> String {
    guard let start = contents.range(of: lldbBlockStart),
          let endMarker = contents.range(of: lldbBlockEnd, range: start.upperBound..<contents.endIndex)
    else {
      return contents
    }
    let end = contents[endMarker.upperBound...].first == "\n"
      ? contents.index(after: endMarker.upperBound)
      : endMarker.upperBound
    var result = contents
    result.removeSubrange(start.lowerBound..<end)
    return result
  }

  private static func shellQuoted(_ value: String) -> String {
    "\"" + value.replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: "\"", with: "\\\"") + "\""
  }

  private static func pythonQuoted(_ value: String) -> String {
    let data = try! JSONEncoder().encode(value)
    return String(data: data, encoding: .utf8)!
  }

  private static func lldbScript(dylibPath: String) -> String {
    """
    import lldb

    DYLIB_PATH = \(pythonQuoted(dylibPath))

    def _orbit_load_simulator_camera(frame, bp_loc, _dict):
        target = frame.GetThread().GetProcess().GetTarget()
        triple = target.GetTriple() or ""
        if "simulator" not in triple.lower():
            return False
        error = lldb.SBError()
        frame.GetThread().GetProcess().LoadImage(lldb.SBFileSpec(DYLIB_PATH), error)
        if error.Fail():
            print("Expo Orbit Simulator Camera: " + error.GetCString())
        return False

    def __lldb_init_module(debugger, _dict):
        target = debugger.GetSelectedTarget()
        breakpoint = target.BreakpointCreateByName("main")
        breakpoint.SetOneShot(True)
        breakpoint.SetScriptCallbackFunction(
            "orbit_simulator_camera._orbit_load_simulator_camera"
        )
    """
  }
}

public class SimulatorCameraModule: Module {
  private let streamer = CameraStreamer()
  private var lastError: String?

  public func definition() -> ModuleDefinition {
    Name("SimulatorCamera")

    AsyncFunction("getStatus") { status() }

    AsyncFunction("install") { () -> [String: Any] in
      do {
        try InjectionInstaller.install()
        lastError = nil
      } catch {
        lastError = error.localizedDescription
      }
      return status()
    }

    AsyncFunction("uninstall") { () -> [String: Any] in
      streamer.stop()
      do {
        try InjectionInstaller.uninstall()
        lastError = nil
      } catch {
        lastError = error.localizedDescription
      }
      return status()
    }

    AsyncFunction("start") { (promise: Promise) in
      let beginStreaming = { [weak self] in
        guard let self else { return }
        do {
          try streamer.start()
          lastError = nil
        } catch {
          lastError = error.localizedDescription
        }
        promise.resolve(status())
      }

      switch AVCaptureDevice.authorizationStatus(for: .video) {
      case .authorized:
        beginStreaming()
      case .notDetermined:
        AVCaptureDevice.requestAccess(for: .video) { granted in
          DispatchQueue.main.async {
            if granted {
              beginStreaming()
            } else {
              self.lastError = "Camera access was denied. Enable it in System Settings."
              promise.resolve(self.status())
            }
          }
        }
      default:
        lastError = "Camera access was denied. Enable it in System Settings."
        promise.resolve(status())
      }
    }.runOnQueue(.main)

    AsyncFunction("stop") { () -> [String: Any] in
      streamer.stop()
      lastError = nil
      return status()
    }.runOnQueue(.main)

    OnDestroy {
      streamer.stop()
    }
  }

  private func status() -> [String: Any] {
    var result: [String: Any] = [
      "installed": InjectionInstaller.isInstalled,
      "streaming": streamer.isStreaming,
    ]
    if let cameraName = streamer.cameraName { result["cameraName"] = cameraName }
    if let lastError { result["error"] = lastError }
    return result
  }
}
