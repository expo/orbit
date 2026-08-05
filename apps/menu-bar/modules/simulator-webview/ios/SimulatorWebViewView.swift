import ExpoModulesCore
import WebKit

/**
 * A thin WKWebView wrapper used to embed the EAS Simulator preview (serve-sim)
 * inside Orbit. serve-sim already renders the device bezel and forwards pointer,
 * keyboard and drag-and-drop input, so this view only has to host the page.
 *
 * A webview *navigates* to the preview URL, which makes it a top-level browsing
 * context just like a browser tab. That matters: serve-sim gates its /exec route
 * on a same-origin bearer token, and framing headers do not apply. An <iframe>
 * would break both.
 */
class SimulatorWebViewView: ExpoView, WKNavigationDelegate {
  let onLoadingChange = EventDispatcher()
  let onLoadError = EventDispatcher()

  private var webView: WKWebView!
  private var currentURL: URL?
  private var injectedCSS: String?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true

    let configuration = WKWebViewConfiguration()
    // The preview streams MJPEG/H.264 and plays it without a user gesture.
    configuration.mediaTypesRequiringUserActionForPlayback = []

    webView = WKWebView(frame: .zero, configuration: configuration)
    webView.navigationDelegate = self
    webView.allowsMagnification = false
    addSubview(webView)
  }

  override func layout() {
    super.layout()
    webView.frame = bounds
  }

  func setURL(_ urlString: String?) {
    guard let urlString, let url = URL(string: urlString) else { return }
    // Avoid reloading the stream every time an unrelated prop changes.
    if let currentURL, currentURL == url { return }
    currentURL = url
    webView.load(URLRequest(url: url))
  }

  /// Design B: hide serve-sim's own page chrome so only the framed device shows.
  /// serve-sim has no supported embed mode yet, so this is selector-based and will
  /// need revisiting whenever the preview UI changes.
  func setInjectedCSS(_ css: String?) {
    injectedCSS = css
    applyInjectedCSS()
  }

  /// Lets the page's rounded bezel artwork show through to a transparent window.
  func setTransparent(_ transparent: Bool) {
    webView.setValue(!transparent, forKey: "drawsBackground")
  }

  func reload() {
    webView.reload()
  }

  private func applyInjectedCSS() {
    guard let injectedCSS, !injectedCSS.isEmpty else { return }
    let escaped = injectedCSS
      .replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: "`", with: "\\`")
    let script = """
      (function() {
        var id = 'orbit-injected-css';
        var el = document.getElementById(id);
        if (!el) {
          el = document.createElement('style');
          el.id = id;
          document.head.appendChild(el);
        }
        el.textContent = `\(escaped)`;
      })();
      """
    webView.evaluateJavaScript(script)
  }

  func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
    onLoadingChange(["isLoading": true])
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    applyInjectedCSS()
    onLoadingChange(["isLoading": false])
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    onLoadingChange(["isLoading": false])
    onLoadError(["message": error.localizedDescription])
  }

  func webView(
    _ webView: WKWebView,
    didFailProvisionalNavigation navigation: WKNavigation!,
    withError error: Error
  ) {
    onLoadingChange(["isLoading": false])
    onLoadError(["message": error.localizedDescription])
  }
}
