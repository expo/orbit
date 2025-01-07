import ExpoModulesCore

private let onOpenFileEvent = "onOpenFile"

public class FileHandlerModule: Module {
  private var hasListeners = false

  public func definition() -> ModuleDefinition {
    Name("FileHandler")

    Events(onOpenFileEvent)

    OnStartObserving {
        hasListeners = true
        NotificationCenter.default.addObserver(
          self,
          selector: #selector(self.onOpenFile),
          name: NSNotification.Name("ExpoOrbit_OnOpenFile"),
          object: nil
        )
      }

      OnStopObserving {
        hasListeners = false
        NotificationCenter.default.removeObserver(
          self,
          name: NSNotification.Name("ExpoOrbit_OnOpenFile"),
          object: nil
        )
      }

  }

  @objc
  private func onOpenFile(_ notification: Notification) {
    if !hasListeners {
      return
    }

    if let filename = notification.object as? String {
            sendEvent(onOpenFileEvent, ["path": filename])
        }
  }
}
