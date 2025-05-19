import Cocoa
import Expo
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications

@main
@objc(AppDelegate)
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  private var statusItem: NSStatusItem?
  private var popover: NSPopover?
  private var httpServer: SwifterWrapper?

#if RCT_DEV
  private var devWindowController: NSWindowController?
#endif

  public override func applicationDidFinishLaunching(_ notification: Notification) {

    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

    super.applicationDidFinishLaunching(notification)
  }

  public override func loadMacOSWindow(launchOptions: [UIApplication.LaunchOptionsKey: Any]?) {
    statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

    statusItem?.button?.target = self
    statusItem?.button?.sendAction(on: [.rightMouseUp, .leftMouseUp])
    statusItem?.button?.action = #selector(onPressStatusItem(_:))

    guard let rootView = factory?.rootViewFactory.view(withModuleName: "main", initialProperties: [:], launchOptions: launchOptions) else{
      return
    }

    let rootViewController = NSViewController()
    rootViewController.view = rootView

    popover = NSPopover()
    popover?.contentSize = NSSize(width: 380, height: 450)
    popover?.contentViewController = rootViewController
    popover?.behavior = .transient
   addPopoverObservers()


#if SHOW_DOCK_ICON && RCT_DEV
    NSApp.setActivationPolicy(.regular)
#endif

    NSApp.activate(ignoringOtherApps: true)
  }

  private func createContextMenu() -> NSMenu {
    let menu = NSMenu(title: "My Menu")
    menu.addItem(withTitle: "Settings...", action: #selector(settingsAction(_:)), keyEquivalent: "")
    menu.addItem(withTitle: "Quit", action: #selector(quitAction(_:)), keyEquivalent: "q")
    return menu
  }

  @objc private func quitAction(_ sender: Any?) {
    exit(0)
  }

  @objc private func settingsAction(_ sender: Any?) {
//    let windowNavigator = WindowNavigator.shared
//    windowNavigator.openWindow("Settings", options: [
//      "windowStyle": [
//        "titlebarAppearsTransparent": true,
//        "height": 580.0,
//        "width": 500.0
//      ]
//    ])
  }
  // Linking API
//  public override func application(
//    _ app: UIApplication,
//    open url: URL,
//    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
//  ) -> Bool {
//    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
//  }
//
//  // Universal Links
//  public override func application(
//    _ application: UIApplication,
//    continue userActivity: NSUserActivity,
//    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
//  ) -> Bool {
//    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
//    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
//  }

  func openPopover() {
    guard let statusButton = statusItem?.button else { return }
    popover?.show(relativeTo: statusButton.bounds, of: statusButton, preferredEdge: .minY)
    popover?.contentViewController?.view.window?.makeKey()

//    bridge?.enqueueJSCall("RCTDeviceEventEmitter.emit", args: [
//      "popoverFocused", [
//        "screenSize": [
//          "height": NSScreen.main?.frame.height ?? 0,
//          "width": NSScreen.main?.frame.width ?? 0
//        ]
//      ]
//    ])
  }

  func closePopover() {
    popover?.close()
  }

  func setPopoverContentSize(_ size: NSSize) {
    popover?.contentSize = size
    popover?.contentViewController?.view.setFrameSize(size)
  }

  private func addPopoverObservers() {
    let center = NotificationCenter.default
    center.addObserver(forName: Notification.Name("ExpoOrbit_OpenPopover"), object: nil, queue: nil) { [weak self] _ in
      self?.openPopover()
    }
    center.addObserver(forName: Notification.Name("ExpoOrbit_ClosePopover"), object: nil, queue: nil) { [weak self] _ in
      self?.closePopover()
    }
  }

  @objc private func onPressStatusItem(_ sender: Any?) {
    guard let event = NSApp.currentEvent else { return }

    if event.type == .rightMouseUp {
      statusItem?.popUpMenu(createContextMenu())
      return
    }

    if popover?.isShown == true {
      closePopover()
    } else {
      openPopover()
    }
  }


  @IBAction func showHelp(_ sender: Any?) {
    NSWorkspace.shared.open(URL(string: "https://docs.expo.dev/build/orbit/")!)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins
  
 
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
}
