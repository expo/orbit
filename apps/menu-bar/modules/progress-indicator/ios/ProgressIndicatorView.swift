import ExpoModulesCore

class ProgressIndicatorView: ExpoView {
  let progressIndicatorView = NSProgressIndicator()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true

    progressIndicatorView.style = .bar
    progressIndicatorView.minValue = 0.0
    progressIndicatorView.maxValue = 100.0
    addSubview(progressIndicatorView)
  }

  override func layoutSubviews() {
    progressIndicatorView.frame = bounds
  }

  func setIndeterminate(_ indeterminate: Bool) {
    progressIndicatorView.isIndeterminate = indeterminate
    if indeterminate {
      progressIndicatorView.startAnimation(nil)
    } else {
      progressIndicatorView.stopAnimation(self)
    }
  }

  func setProgress(_ progress: Double) {
    progressIndicatorView.doubleValue = progress

    if progressIndicatorView.isIndeterminate {
      setIndeterminate(false)
    }
  }
}
