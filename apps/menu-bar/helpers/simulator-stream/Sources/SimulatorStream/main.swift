import CoreGraphics
import Foundation

// MARK: - Logging (to stderr so it doesn't interfere with frame output on stdout)

func log(_ message: String) {
    let data = "[simulator-stream] \(message)\n".data(using: .utf8)!
    FileHandle.standardError.write(data)
}

// MARK: - Argument Parsing

struct StreamConfig {
    let udid: String
    let fps: Int
    let quality: CGFloat
    let useCoreGraphics: Bool

    static func parse(from args: [String]) -> StreamConfig {
        var udid = "booted"
        var fps = 30
        var quality: CGFloat = 0.7
        var useCoreGraphics = false

        var i = 1 // Skip executable name
        while i < args.count {
            switch args[i] {
            case "--udid", "-u":
                if i + 1 < args.count {
                    udid = args[i + 1]
                    i += 2
                } else { i += 1 }
            case "--fps", "-f":
                if i + 1 < args.count {
                    fps = Int(args[i + 1]) ?? 30
                    i += 2
                } else { i += 1 }
            case "--quality", "-q":
                if i + 1 < args.count {
                    quality = CGFloat(Double(args[i + 1]) ?? 0.7)
                    i += 2
                } else { i += 1 }
            case "--cg", "--core-graphics":
                useCoreGraphics = true
                i += 1
            case "--help", "-h":
                printUsage()
                exit(0)
            default:
                // If first positional arg, treat as UDID
                if i == 1 && !args[i].hasPrefix("-") {
                    udid = args[i]
                }
                i += 1
            }
        }

        return StreamConfig(
            udid: udid,
            fps: min(max(fps, 1), 60),
            quality: min(max(quality, 0.1), 1.0),
            useCoreGraphics: useCoreGraphics
        )
    }
}

func printUsage() {
    log("""
    Usage: simulator-stream [UDID] [OPTIONS]

    Captures an iOS Simulator window and streams JPEG frames to stdout.
    Each frame is prefixed with an 8-byte hex length header.

    Arguments:
      UDID                    Simulator device UDID (default: "booted")

    Options:
      --udid, -u <UDID>       Simulator device UDID
      --fps, -f <N>           Target frames per second (1-60, default: 30)
      --quality, -q <0.0-1.0> JPEG quality (default: 0.7)
      --cg, --core-graphics   Force CoreGraphics capture (skip ScreenCaptureKit)
      --help, -h              Show this help message
    """)
}

// MARK: - Signal Handling

func setupSignalHandlers() {
    signal(SIGINT) { _ in
        log("Received SIGINT, shutting down...")
        exit(0)
    }
    signal(SIGTERM) { _ in
        log("Received SIGTERM, shutting down...")
        exit(0)
    }
    // Ignore SIGPIPE (broken pipe from parent process closing stdin)
    signal(SIGPIPE, SIG_IGN)
}

// MARK: - Main

func main() async {
    setupSignalHandlers()

    let config = StreamConfig.parse(from: CommandLine.arguments)
    log("Starting capture for device: \(config.udid) at \(config.fps)fps, quality: \(config.quality)")

    // Wait for the Simulator window to appear (retry for up to 10 seconds)
    var windowID: CGWindowID?
    for attempt in 1...20 {
        windowID = findSimulatorWindow(forUDID: config.udid)
        if windowID != nil { break }
        log("Waiting for Simulator window (attempt \(attempt)/20)...")
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5s
    }

    guard let windowID = windowID else {
        log("Error: Could not find Simulator window for device \(config.udid)")
        exit(1)
    }

    log("Found Simulator window ID: \(windowID)")

    // Use ScreenCaptureKit when available and not forced to CG
    if !config.useCoreGraphics {
        if #available(macOS 12.3, *) {
            log("Using ScreenCaptureKit for capture (hardware-accelerated)")
            let capture = SCStreamCapture(quality: config.quality, targetFPS: config.fps)
            do {
                try await capture.start(windowID: windowID)
                log("ScreenCaptureKit stream started")

                // Keep running until terminated
                while true {
                    try await Task.sleep(nanoseconds: 1_000_000_000)
                }
            } catch {
                log("ScreenCaptureKit failed: \(error). Falling back to CoreGraphics.")
                await capture.stop()
                // Fall through to CoreGraphics
            }
        }
    }

    // CoreGraphics fallback
    log("Using CoreGraphics for capture")
    let capture = CGLoopCapture(quality: config.quality, targetFPS: config.fps)
    capture.start(windowID: windowID)

    // Keep running until terminated
    dispatchMain()
}

// Entry point
Task {
    await main()
}

// Keep the run loop alive
RunLoop.main.run()
