import ExpoModulesCore

internal class CLIOutputError: GenericException<String> {
  override var reason: String {
    "Output error: \(param)"
  }
}

internal class LauncherError: Exception {
  override var reason: String {
    "Failed to update login item status."
  }
}

internal class MultiOptionError: Exception {
  override var reason: String {
    "Selection was canceled."
  }
}
