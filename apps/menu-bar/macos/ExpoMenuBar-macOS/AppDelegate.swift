import Cocoa
import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate, NSUserNotificationCenterDelegate {
  var httpServer: SwifterWrapper!
  var popoverManager: PopoverManager!

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
#if RCT_DEV
  var devWindowController: NSWindowController?
#endif

  override func applicationDidFinishLaunching(_ notification: Notification) {
    httpServer = SwifterWrapper()

    super.applicationDidFinishLaunching(notification)

    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

    let rootView =  factory.rootViewFactory.view(
      withModuleName: "main",
      initialProperties: [:],
      launchOptions: notification.userInfo
    )
    let rootViewController = NSViewController()
    rootViewController.view = rootView

    popoverManager = PopoverManager.initializeShared(factory: factory)
    popoverManager.setContentViewController(rootViewController)

#if SHOW_DEV_WINDOW && RCT_DEV
    let storyboard = NSStoryboard(name: "Main", bundle: nil)
    devWindowController = storyboard.instantiateController(withIdentifier: "devViewController") as! NSWindowController
    devWindowController?.showWindow(self)
    devWindowController?.window?.makeKey()
#endif

#if SHOW_DOCK_ICON && RCT_DEV
    NSApp.setActivationPolicy(.regular)
#endif

    NSApp.activate(ignoringOtherApps: true)
  }

   func application(_ sender: NSApplication, openFile filename: String) -> Bool {
    popoverManager?.openPopover()
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

  func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
    if !flag {
      popoverManager?.openPopover()
    }
    return true
  }

  @objc func getUrlEventHandler(_ event: NSAppleEventDescriptor, withReplyEvent replyEvent: NSAppleEventDescriptor) {
    popoverManager?.openPopover()
    RCTLinkingManager.getUrlEventHandler(event, withReplyEvent: replyEvent)
  }

  // MARK: - Universal Links

  override func application(_ application: NSApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([any NSUserActivityRestoring]) -> Void) -> Bool {
    guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
          let url = userActivity.webpageURL else {
      return false
    }

    popoverManager?.openPopover()
    NotificationCenter.default.post(
      name: Notification.Name("RCTOpenURLNotification"),
      object: nil,
      userInfo: ["url": url.absoluteString]
    )
    return true
  }

  @IBAction func showHelp(_ sender: Any) {
    if let url = URL(string: "https://docs.expo.dev/build/orbit/") {
      NSWorkspace.shared.open(url)
    }
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  override func customize(_ rootView: RCTRootView) {
    rootView.backgroundColor = NSColor.clear
  }
}
