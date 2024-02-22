import ExpoModulesCore
import Sparkle

public class AutoUpdaterModule: Module {
  var updateController = SPUStandardUpdaterController(startingUpdater: true, updaterDelegate: nil, userDriverDelegate: nil)

  public func definition() -> ModuleDefinition {
    Name("AutoUpdater")

    AsyncFunction("checkForUpdates") {
        self.updateController.updater.checkForUpdates()
    }.runOnQueue(.main)

    AsyncFunction("getAutomaticallyChecksForUpdates") { (promise: Promise) in
      promise.resolve(updateController.updater.automaticallyChecksForUpdates)
    }

    AsyncFunction("setAutomaticallyChecksForUpdates") { (value: Bool) in
      updateController.updater.automaticallyChecksForUpdates = value
    }
  }
}
