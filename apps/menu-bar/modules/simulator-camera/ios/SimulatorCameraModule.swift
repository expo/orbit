import ExpoModulesCore

private let onStatusChange = "onStatusChange"

/// A virtual camera for iOS simulators: Orbit injects a shim into simulator apps and feeds it
/// frames from a Mac camera, an image, a video or a QR code. See SimulatorCameraController.
public class SimulatorCameraModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SimulatorCamera")

    Events(onStatusChange)

    Constant("framesDirectory") {
      SimulatorCameraController.shared.framesDirectory
    }

    OnCreate {
      SimulatorCameraController.shared.onStatusChange = { [weak self] status in
        self?.sendEvent(onStatusChange, status.dictionary)
      }
    }

    AsyncFunction("getStatus") { () -> [String: Any] in
      SimulatorCameraController.shared.status().dictionary
    }

    AsyncFunction("setEnabled") { (enabled: Bool) -> [String: Any] in
      do {
        return try SimulatorCameraController.shared.setEnabled(enabled).dictionary
      } catch {
        throw Exception(name: "ERR_SIMULATOR_CAMERA", description: error.localizedDescription)
      }
    }

    AsyncFunction("setSource") { (position: String, source: [String: Any]) -> [String: Any] in
      guard let position = SimulatorCameraController.Position(rawValue: position) else {
        throw Exception(name: "ERR_SIMULATOR_CAMERA", description: "Unknown camera position: \(position)")
      }
      guard let source = SimulatorCameraSource(dictionary: source) else {
        throw Exception(name: "ERR_SIMULATOR_CAMERA", description: "Unknown camera source: \(source)")
      }
      return SimulatorCameraController.shared.setSource(source, for: position).dictionary
    }

    AsyncFunction("refreshSimulators") { () -> [String: Any] in
      SimulatorCameraController.shared.refreshSimulators().dictionary
    }

    AsyncFunction("listMacCameras") { () -> [[String: String]] in
      FrameSources.availableMacCameras().map { ["id": $0.id, "name": $0.name] }
    }
  }
}
