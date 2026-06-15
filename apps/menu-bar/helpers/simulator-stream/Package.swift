// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SimulatorStream",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "SimulatorStream",
            path: "Sources/SimulatorStream",
            linkerSettings: [
                .linkedFramework("CoreGraphics"),
                .linkedFramework("ScreenCaptureKit"),
                .linkedFramework("AppKit"),
                .linkedFramework("ImageIO"),
                .linkedFramework("CoreImage"),
            ]
        ),
    ]
)
