import ExpoModulesCore

class SystemIconView: ExpoView {
  let imageView = NSImageView()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    imageView.imageScaling = .scaleProportionallyUpOrDown
    addSubview(imageView)
  }

  override func layoutSubviews() {
    imageView.frame = bounds
  }

  func setSystemIconName(_ name: String?) {
    guard let name, let image = NSImage(systemSymbolName: name, accessibilityDescription: nil) else {
      return
    }
    image.isTemplate = true
    imageView.image = image
  }

  func setIconTintColor(_ color: NSColor?) {
    imageView.contentTintColor = color
  }
}
