import Foundation

/// Puts the camera shim into booted simulators, through the simulator's launchd environment:
/// every app the simulator launches afterwards loads the shim. Apps that already run keep
/// going without it until they relaunch.
enum SimulatorInjector {
  struct Simulator: Equatable {
    let udid: String
    let name: String
    let runtime: String
  }

  static let insertKeys = ["DYLD_INSERT_LIBRARIES", "__XPC_DYLD_INSERT_LIBRARIES"]
  static let framesDirectoryKey = "ORBIT_SIMULATOR_CAMERA_DIR"

  static func bootedSimulators() throws -> [Simulator] {
    let output = try run(["simctl", "list", "devices", "booted", "-j"])
    guard let json = try JSONSerialization.jsonObject(with: Data(output.utf8)) as? [String: Any],
      let devices = json["devices"] as? [String: [[String: Any]]]
    else { return [] }
    var result: [Simulator] = []
    for (runtime, list) in devices {
      for device in list where device["state"] as? String == "Booted" {
        guard let udid = device["udid"] as? String, let name = device["name"] as? String else { continue }
        result.append(Simulator(udid: udid, name: name, runtime: runtime))
      }
    }
    return result.sorted { $0.name < $1.name }
  }

  static func inject(udid: String, dylibPath: String, framesDirectory: String) throws {
    for key in insertKeys {
      try launchctl(udid: udid, ["setenv", key, dylibPath])
    }
    try launchctl(udid: udid, ["setenv", framesDirectoryKey, framesDirectory])
  }

  static func remove(udid: String) throws {
    for key in insertKeys + [framesDirectoryKey] {
      try launchctl(udid: udid, ["unsetenv", key])
    }
  }

  /// Whether the simulator's launchd points at `dylibPath`.
  static func isInjected(udid: String, dylibPath: String) -> Bool {
    guard let value = try? launchctl(udid: udid, ["getenv", "DYLD_INSERT_LIBRARIES"]) else { return false }
    return value.trimmingCharacters(in: .whitespacesAndNewlines) == dylibPath
  }

  @discardableResult
  private static func launchctl(udid: String, _ arguments: [String]) throws -> String {
    try run(["simctl", "spawn", udid, "launchctl"] + arguments)
  }

  private static func run(_ arguments: [String]) throws -> String {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/xcrun")
    process.arguments = arguments
    let output = Pipe()
    let error = Pipe()
    process.standardOutput = output
    process.standardError = error
    try process.run()
    let outputData = output.fileHandleForReading.readDataToEndOfFile()
    let errorData = error.fileHandleForReading.readDataToEndOfFile()
    process.waitUntilExit()
    guard process.terminationStatus == 0 else {
      throw SimulatorInjectorError.commandFailed(
        "xcrun " + arguments.joined(separator: " "),
        String(data: errorData, encoding: .utf8) ?? "")
    }
    return String(data: outputData, encoding: .utf8) ?? ""
  }
}

enum SimulatorInjectorError: LocalizedError {
  case commandFailed(String, String)

  var errorDescription: String? {
    switch self {
    case .commandFailed(let command, let stderr):
      return "\(command) failed: \(stderr.trimmingCharacters(in: .whitespacesAndNewlines))"
    }
  }
}
