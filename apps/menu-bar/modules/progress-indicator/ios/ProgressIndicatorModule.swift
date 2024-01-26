import ExpoModulesCore

public class ProgressIndicatorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ProgressIndicator")

    View(ProgressIndicatorView.self) {
      Prop("indeterminate") { (view, isIndeterminate: Bool?) in
        if let isIndeterminate {
          view.setIndeterminate(isIndeterminate)
        } else {
          view.setIndeterminate(false)
        }
      }

      Prop("progress") { (view, progress: Double) in
        view.setProgress(progress)
      }
    }
  }
}
