import CryptoKit
import Foundation

/// Builds the camera shim that is injected into simulator apps.
///
/// The shim ships as source (OrbitSimulatorCamera.objc and OrbitCameraShared.h are resources of
/// the app bundle) and is compiled on the user's machine with the iOS Simulator SDK of the
/// selected Xcode. That keeps a Mach-O for another platform out of the app bundle, where it
/// could not be signed as part of the app, and matches the shim to the simulator runtimes
/// the user actually has. The build takes a few seconds and is cached by the hash of the
/// source and the SDK.
enum DylibBuilder {
  static let productName = "libOrbitSimulatorCamera.dylib"

  static var cacheDirectory: URL {
    let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    return appSupport.appendingPathComponent("expo-orbit/simulator-camera", isDirectory: true)
  }

  /// Returns the path of a shim built from the current source, building it when needed.
  static func ensureBuilt(progress: ((String) -> Void)? = nil) throws -> String {
    guard let sourceURL = Bundle.main.url(forResource: "OrbitSimulatorCamera", withExtension: "objc"),
      let headerURL = Bundle.main.url(forResource: "OrbitCameraShared", withExtension: "h")
    else {
      throw DylibBuilderError.sourceMissing
    }
    let sdkPath = try xcrun(["--sdk", "iphonesimulator", "--show-sdk-path"]).trimmingCharacters(in: .whitespacesAndNewlines)
    guard !sdkPath.isEmpty else { throw DylibBuilderError.sdkMissing }

    var hasher = SHA256()
    hasher.update(data: try Data(contentsOf: sourceURL))
    hasher.update(data: try Data(contentsOf: headerURL))
    hasher.update(data: Data(sdkPath.utf8))
    let digest = hasher.finalize().map { String(format: "%02x", $0) }.joined().prefix(16)
    let buildDirectory = cacheDirectory.appendingPathComponent(String(digest), isDirectory: true)
    let product = buildDirectory.appendingPathComponent(productName)
    if FileManager.default.fileExists(atPath: product.path) {
      return product.path
    }

    progress?("Building the simulator camera helper…")
    try FileManager.default.createDirectory(at: buildDirectory, withIntermediateDirectories: true)
    // The header is included by name; compile from a directory that has both files.
    let stagedSource = buildDirectory.appendingPathComponent("OrbitSimulatorCamera.m")
    let stagedHeader = buildDirectory.appendingPathComponent("OrbitCameraShared.h")
    try? FileManager.default.removeItem(at: stagedSource)
    try? FileManager.default.removeItem(at: stagedHeader)
    try FileManager.default.copyItem(at: sourceURL, to: stagedSource)
    try FileManager.default.copyItem(at: headerURL, to: stagedHeader)

    let temporaryProduct = buildDirectory.appendingPathComponent("\(productName).building")
    let frameworks = ["Foundation", "AVFoundation", "CoreMedia", "CoreVideo", "CoreImage", "UIKit", "QuartzCore", "CoreGraphics", "ImageIO"]
    var arguments = [
      "--sdk", "iphonesimulator", "clang",
      "-arch", "arm64", "-arch", "x86_64",
      "-isysroot", sdkPath,
      "-mios-simulator-version-min=15.0",
      "-fobjc-arc", "-fmodules", "-dynamiclib", "-O2",
      "-Wno-deprecated-declarations",
      "-I", buildDirectory.path,
      "-install_name", "@rpath/\(productName)",
      "-o", temporaryProduct.path,
      stagedSource.path,
    ]
    for framework in frameworks {
      arguments += ["-framework", framework]
    }
    do {
      _ = try xcrun(arguments)
    } catch let error as DylibBuilderError {
      if case .commandFailed(_, let output) = error {
        throw DylibBuilderError.compileFailed(output)
      }
      throw error
    }
    // The simulator's dyld accepts unsigned libraries, but an ad-hoc signature keeps it that
    // way should that change, and makes the file self-describing.
    _ = try run("/usr/bin/codesign", ["--sign", "-", "--force", temporaryProduct.path])
    try? FileManager.default.removeItem(at: product)
    try FileManager.default.moveItem(at: temporaryProduct, to: product)
    return product.path
  }

  private static func xcrun(_ arguments: [String]) throws -> String {
    try run("/usr/bin/xcrun", arguments)
  }

  private static func run(_ executable: String, _ arguments: [String]) throws -> String {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: executable)
    process.arguments = arguments
    let output = Pipe()
    process.standardOutput = output
    process.standardError = output
    try process.run()
    let data = output.fileHandleForReading.readDataToEndOfFile()
    process.waitUntilExit()
    let text = String(data: data, encoding: .utf8) ?? ""
    guard process.terminationStatus == 0 else {
      throw DylibBuilderError.commandFailed(([executable] + arguments).joined(separator: " "), text)
    }
    return text
  }
}

enum DylibBuilderError: LocalizedError {
  case sourceMissing
  case sdkMissing
  case compileFailed(String)
  case commandFailed(String, String)

  var errorDescription: String? {
    switch self {
    case .sourceMissing:
      return "The simulator camera source is missing from the app bundle."
    case .sdkMissing:
      return "No iOS Simulator SDK. Install Xcode and select it with xcode-select."
    case .compileFailed(let output):
      let lines = output.split(separator: "\n").filter { $0.contains("error") }.prefix(3)
      return "Building the simulator camera helper failed: " + (lines.isEmpty ? output : lines.joined(separator: " "))
    case .commandFailed(let command, let output):
      return "\(command) failed: \(output.trimmingCharacters(in: .whitespacesAndNewlines))"
    }
  }
}
