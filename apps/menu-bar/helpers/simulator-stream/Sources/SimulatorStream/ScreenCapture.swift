import AppKit
import CoreGraphics
import Foundation
import ImageIO
import ScreenCaptureKit

// MARK: - Frame Output

/// Writes a length-prefixed JPEG frame to stdout.
/// Format: 8-byte hex length prefix + raw JPEG data
func writeFrame(_ jpegData: Data) {
    let lenHex = String(format: "%08x", jpegData.count)
    guard let lenData = lenHex.data(using: .ascii) else { return }

    let stdout = FileHandle.standardOutput
    stdout.write(lenData)
    stdout.write(jpegData)
}

/// Encodes a CGImage to JPEG data at the given quality (0.0-1.0).
func encodeJPEG(_ image: CGImage, quality: CGFloat = 0.7) -> Data? {
    let data = NSMutableData()
    guard let dest = CGImageDestinationCreateWithData(
        data as CFMutableData,
        "public.jpeg" as CFString,
        1,
        nil
    ) else { return nil }

    let options: [CFString: Any] = [
        kCGImageDestinationLossyCompressionQuality: quality
    ]
    CGImageDestinationAddImage(dest, image, options as CFDictionary)

    guard CGImageDestinationFinalize(dest) else { return nil }
    return data as Data
}

// MARK: - Window Discovery

/// Find the Simulator window matching the given device UDID.
/// Simulator.app window titles follow the pattern: "DeviceName – iOS X.Y (UDID)"
func findSimulatorWindow(forUDID udid: String) -> CGWindowID? {
    guard let windowList = CGWindowListCopyWindowInfo(
        [.optionOnScreenOnly, .excludeDesktopElements],
        kCGNullWindowID
    ) as? [[String: Any]] else {
        return nil
    }

    for window in windowList {
        guard let ownerName = window[kCGWindowOwnerName as String] as? String,
              ownerName == "Simulator",
              let windowName = window[kCGWindowName as String] as? String,
              let windowID = window[kCGWindowNumber as String] as? CGWindowID
        else { continue }

        // Match by UDID in window title or by finding any Simulator window
        if windowName.contains(udid) || udid == "booted" {
            return windowID
        }
    }

    // Fallback: return first Simulator window found
    for window in windowList {
        guard let ownerName = window[kCGWindowOwnerName as String] as? String,
              ownerName == "Simulator",
              let windowID = window[kCGWindowNumber as String] as? CGWindowID,
              let bounds = window[kCGWindowBounds as String] as? [String: Any],
              let width = bounds["Width"] as? CGFloat,
              width > 100 // Skip tiny/toolbar windows
        else { continue }

        return windowID
    }

    return nil
}

/// Get window bounds for a given window ID.
func getWindowBounds(_ windowID: CGWindowID) -> CGRect? {
    guard let windowList = CGWindowListCopyWindowInfo(
        [.optionIncludingWindow],
        windowID
    ) as? [[String: Any]],
        let window = windowList.first,
        let boundsDict = window[kCGWindowBounds as String] as? [String: Any]
    else { return nil }

    let bounds = CGRect(
        x: boundsDict["X"] as? CGFloat ?? 0,
        y: boundsDict["Y"] as? CGFloat ?? 0,
        width: boundsDict["Width"] as? CGFloat ?? 0,
        height: boundsDict["Height"] as? CGFloat ?? 0
    )
    return bounds
}

// MARK: - CoreGraphics Capture (Fallback)

/// Captures the simulator window using CoreGraphics (works on all macOS versions).
/// Achieves ~20-30fps depending on window size.
func captureWithCoreGraphics(windowID: CGWindowID) -> CGImage? {
    return CGWindowListCreateImage(
        .null,
        .optionIncludingWindow,
        windowID,
        [.boundsIgnoreFraming, .bestResolution]
    )
}

// MARK: - ScreenCaptureKit Capture (macOS 12.3+, high performance)

/// ScreenCaptureKit-based capture that provides hardware-accelerated,
/// low-latency window capture at up to 60fps.
@available(macOS 12.3, *)
class SCStreamCapture: NSObject, SCStreamDelegate, SCStreamOutput {
    private var stream: SCStream?
    private var isRunning = false
    private let quality: CGFloat
    private let targetFPS: Int

    init(quality: CGFloat = 0.7, targetFPS: Int = 30) {
        self.quality = quality
        self.targetFPS = targetFPS
        super.init()
    }

    func start(windowID: CGWindowID) async throws {
        let content = try await SCShareableContent.excludingDesktopWindows(
            false,
            onScreenWindowsOnly: true
        )

        guard let window = content.windows.first(where: { $0.windowID == windowID }) else {
            throw CaptureError.windowNotFound
        }

        let filter = SCContentFilter(desktopIndependentWindow: window)

        let config = SCStreamConfiguration()
        config.width = Int(window.frame.width) * 2  // Retina
        config.height = Int(window.frame.height) * 2
        config.minimumFrameInterval = CMTime(value: 1, timescale: CMTimeScale(targetFPS))
        config.queueDepth = 3
        config.showsCursor = false
        config.pixelFormat = kCVPixelFormatType_32BGRA

        let stream = SCStream(filter: filter, configuration: config, delegate: self)
        try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: .global(qos: .userInteractive))
        try await stream.startCapture()

        self.stream = stream
        self.isRunning = true
    }

    func stop() async {
        guard let stream = stream else { return }
        do {
            try await stream.stopCapture()
        } catch {
            log("Error stopping capture: \(error)")
        }
        self.stream = nil
        self.isRunning = false
    }

    // SCStreamOutput: called for each captured frame
    func stream(
        _ stream: SCStream,
        didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
        of type: SCStreamOutputType
    ) {
        guard type == .screen,
              let imageBuffer = sampleBuffer.imageBuffer
        else { return }

        let ciImage = CIImage(cvImageBuffer: imageBuffer)
        let context = CIContext()
        let width = CVPixelBufferGetWidth(imageBuffer)
        let height = CVPixelBufferGetHeight(imageBuffer)

        guard let cgImage = context.createCGImage(
            ciImage,
            from: CGRect(x: 0, y: 0, width: width, height: height)
        ) else { return }

        guard let jpegData = encodeJPEG(cgImage, quality: quality) else { return }
        writeFrame(jpegData)
    }

    // SCStreamDelegate: handle errors
    func stream(_ stream: SCStream, didStopWithError error: Error) {
        log("Stream stopped with error: \(error)")
        isRunning = false
    }
}

// MARK: - CoreGraphics Loop Capture

/// Fallback capture loop using CoreGraphics for older macOS versions.
class CGLoopCapture {
    private var isRunning = false
    private let quality: CGFloat
    private let targetFPS: Int

    init(quality: CGFloat = 0.7, targetFPS: Int = 30) {
        self.quality = quality
        self.targetFPS = targetFPS
    }

    func start(windowID: CGWindowID) {
        isRunning = true
        let interval = 1.0 / Double(targetFPS)

        DispatchQueue.global(qos: .userInteractive).async { [weak self] in
            while self?.isRunning == true {
                let startTime = CFAbsoluteTimeGetCurrent()

                if let image = captureWithCoreGraphics(windowID: windowID),
                   let jpegData = encodeJPEG(image, quality: self?.quality ?? 0.7) {
                    writeFrame(jpegData)
                }

                let elapsed = CFAbsoluteTimeGetCurrent() - startTime
                let sleepTime = max(0, interval - elapsed)
                if sleepTime > 0 {
                    Thread.sleep(forTimeInterval: sleepTime)
                }
            }
        }
    }

    func stop() {
        isRunning = false
    }
}

// MARK: - Errors

enum CaptureError: Error, CustomStringConvertible {
    case windowNotFound
    case simulatorNotRunning

    var description: String {
        switch self {
        case .windowNotFound:
            return "Simulator window not found"
        case .simulatorNotRunning:
            return "No running Simulator window found for the specified device"
        }
    }
}
