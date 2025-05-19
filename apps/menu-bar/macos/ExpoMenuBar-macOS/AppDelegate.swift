import Cocoa
import React
import React_RCTAppDelegate

@main
class AppDelegate: RCTAppDelegate, NSUserNotificationCenterDelegate {
  var httpServer: SwifterWrapper!
  var popoverManager: PopoverManager!

#if RCT_DEV
  var devWindowController: NSWindowController?
#endif

  override func applicationDidFinishLaunching(_ notification: Notification) {
    httpServer = SwifterWrapper()

    moduleName = "main"
    initialProps = [:]

    // We can't override `loadReactNativeWindow` from Swift
    self.automaticallyLoadReactNativeWindow = false
    super.applicationDidFinishLaunching(notification)

    loadReactNativeWindow(notification.userInfo)
  }

   func loadReactNativeWindow(_ launchOptions: [AnyHashable: Any]!) {
    let rootView = self.rootViewFactory().view(
      withModuleName: self.moduleName!,
      initialProperties: initialProps,
      launchOptions: launchOptions
    )
    let rootViewController = NSViewController()
    rootViewController.view = rootView

    popoverManager = PopoverManager.initializeShared(delegate: self)
    popoverManager.setContentViewController(rootViewController)

#if SHOW_DEV_WINDOW && RCT_DEV
    let storyboard = NSStoryboard(name: "Main", bundle: nil)
    devWindowController = storyboard.instantiateController(withIdentifier: "devViewController")
    devWindowController?.showWindow(self)
    devWindowController?.window?.makeKeyWindow()
#endif

#if SHOW_DOCK_ICON && RCT_DEV
    NSApp.setActivationPolicy(.regular)
#endif

    NSApp.activate(ignoringOtherApps: true)
  }

  override func customize(_ rootView: RCTRootView!) {
    rootView.backgroundColor = NSColor.clear
  }

  override func application(_ sender: NSApplication, openFile filename: String) -> Bool {
    popoverManager.openPopover()
    NotificationCenter.default.post(
      name: Notification.Name("ExpoOrbit_OnOpenFile"),
      object: filename
    )
    return true
  }

  override func applicationWillFinishLaunching(_ notification: Notification) {
    NSUserNotificationCenter.default.delegate = self

    NSAppleEventManager.shared().setEventHandler(
      self,
      andSelector: #selector(getUrlEventHandler(_:withReplyEvent:)),
      forEventClass: AEEventClass(kInternetEventClass),
      andEventID: AEEventID(kAEGetURL)
    )
  }

  override func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
    if !flag {
      popoverManager.openPopover()
    }
    return true
  }

  @objc func getUrlEventHandler(_ event: NSAppleEventDescriptor, withReplyEvent replyEvent: NSAppleEventDescriptor) {
    popoverManager.openPopover()
    RCTLinkingManager.getUrlEventHandler(event, withReplyEvent: replyEvent)
  }

  // MARK: - RCTBridgeDelegate

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(
      forBundleRoot: ".expo/.virtual-metro-entry",
      fallbackExtension: nil
    )
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  @IBAction func showHelp(_ sender: Any) {
    if let url = URL(string: "https://docs.expo.dev/build/orbit/") {
      NSWorkspace.shared.open(url)
    }
  }
}
