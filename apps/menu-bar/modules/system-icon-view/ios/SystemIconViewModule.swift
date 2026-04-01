import ExpoModulesCore

public class SystemIconViewModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SystemIconView")

    View(SystemIconView.self) {
      Prop("systemIconName") { (view, name: String?) in
        view.setSystemIconName(name)
      }

      Prop("tintColor") { (view, color: NSColor?) in
        view.setIconTintColor(color)
      }
    }
  }
}
