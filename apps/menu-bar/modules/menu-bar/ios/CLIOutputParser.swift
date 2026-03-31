import Foundation

private let returnOutputMarker = "---- return output ----"
private let thrownErrorMarker = "---- thrown error ----"

public struct CLIOutputResult {
  public let returnOutput: String?
  public let error: String?
  public let fullOutput: String
}

public func isCliOutputMarker(_ line: String) -> Bool {
  return line == returnOutputMarker || line == thrownErrorMarker
}

public func parseCliOutput(_ output: String) -> CLIOutputResult {
  let lines = output.components(separatedBy: .newlines).filter { !$0.isEmpty }

  var fullOutput = ""
  var returnOutput = ""
  var hasReachedReturnOutput = false
  var hasReachedError = false

  for line in lines {
    fullOutput.append(line)

    if hasReachedReturnOutput || hasReachedError {
      returnOutput.append(line)
    } else if line == returnOutputMarker {
      hasReachedReturnOutput = true
    } else if line == thrownErrorMarker {
      hasReachedError = true
    }
  }

  if hasReachedError {
    return CLIOutputResult(returnOutput: nil, error: returnOutput, fullOutput: fullOutput)
  }

  return CLIOutputResult(
    returnOutput: hasReachedReturnOutput ? returnOutput : nil,
    error: nil,
    fullOutput: fullOutput
  )
}

public func getCliResourceNameForArch() -> String {
  var sysinfo = utsname()
  uname(&sysinfo)
  let machine = withUnsafePointer(to: &sysinfo.machine) {
    $0.withMemoryRebound(to: CChar.self, capacity: Int(_SYS_NAMELEN)) {
      ptr in String(cString: ptr)
    }
  }
  return machine == "arm64" ? "orbit-cli-arm64" : "orbit-cli-x64"
}
