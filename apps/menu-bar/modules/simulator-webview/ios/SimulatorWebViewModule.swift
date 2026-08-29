import ExpoModulesCore

public class SimulatorWebViewModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SimulatorWebView")

    View(SimulatorWebViewView.self) {
      Events("onLoadingChange", "onLoadError")

      Prop("url") { (view, url: String?) in
        view.setURL(url)
      }

      Prop("injectedCSS") { (view, css: String?) in
        view.setInjectedCSS(css)
      }

      Prop("transparent") { (view, transparent: Bool?) in
        view.setTransparent(transparent ?? false)
      }

      AsyncFunction("reload") { (view: SimulatorWebViewView) in
        view.reload()
      }
    }
  }
}
