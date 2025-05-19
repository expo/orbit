import Cocoa
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications

@main
@objc(AppDelegate)
class AppDelegate: RCTAppDelegate, NSUserNotificationCenterDelegate {
  private var statusItem: NSStatusItem?
  private var popover: NSPopover?
  private var httpServer: SwifterWrapper?
  
#if RCT_DEV
  private var devWindowController: NSWindowController?
#endif
  
  override init() {
    super.init()
    httpServer = SwifterWrapper()
  }
  
  required init?(coder: NSCoder) {
    super.init()
    httpServer = SwifterWrapper()
  }
  
  override func applicationDidFinishLaunching(_ notification: Notification) {
    moduleName = "main"
    initialProps = [:]
    
    super.applicationDidFinishLaunching(notification)
  }
  
//  override func loadReactNativeWindow(
  
  func loadReactNativeWindow(_ launchOptions: [AnyHashable: Any]?) {
    statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    
//    let dragDropView = DragDropStatusItemView(frame: NSRect(x: 0, y: 0, width: 22, height: 22))
//    dragDropView.openPopoverAction = { [weak self] in
//      self?.openPopover()
//    }
    
//    statusItem?.button?.addSubview(dragDropView)
    statusItem?.button?.target = self
    statusItem?.button?.sendAction(on: [.rightMouseUp, .leftMouseUp])
    statusItem?.button?.action = #selector(onPressStatusItem(_:))
    
    let rootView = self.rootViewFactory().view(withModuleName: self.moduleName!, initialProperties: initialProps, launchOptions: launchOptions)
    
    let rootViewController = NSViewController()
    rootViewController.view = rootView
    
    popover = NSPopover()
    popover?.contentSize = NSSize(width: 380, height: 450)
    popover?.contentViewController = rootViewController
    popover?.behavior = .transient
    addPopoverObservers()
    
#if SHOW_DEV_WINDOW && RCT_DEV
    let storyboard = NSStoryboard(name: "Main", bundle: nil)
    devWindowController = storyboard.instantiateController(withIdentifier: "devViewController") as? NSWindowController
    devWindowController?.showWindow(self)
    devWindowController?.window?.makeKey()
#endif
    
#if SHOW_DOCK_ICON && RCT_DEV
    NSApp.setActivationPolicy(.regular)
#endif
    
    NSApp.activate(ignoringOtherApps: true)
  }
  
//  override func customizeRootView(_ rootView: RCTUIView) {
//    rootView.backgroundColor = .clear
//  }
  
  override func application(_ sender: NSApplication, openFile filename: String) -> Bool {
    openPopover()
    NotificationCenter.default.post(name: Notification.Name("ExpoOrbit_OnOpenFile"), object: filename)
    return true
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
  
  func openPopover() {
    guard let statusButton = statusItem?.button else { return }
    popover?.show(relativeTo: statusButton.bounds, of: statusButton, preferredEdge: .minY)
    popover?.contentViewController?.view.window?.makeKey()
    
    bridge?.enqueueJSCall("RCTDeviceEventEmitter.emit", args: [
      "popoverFocused", [
        "screenSize": [
          "height": NSScreen.main?.frame.height ?? 0,
          "width": NSScreen.main?.frame.width ?? 0
        ]
      ]
    ])
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
  
  override func applicationWillTerminate(_ notification: Notification) {
    // Cleanup code
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
      openPopover()
    }
    return true
  }
  
  @objc private func getUrlEventHandler(_ event: NSAppleEventDescriptor?, withReplyEvent replyEvent: NSAppleEventDescriptor?) {
    openPopover()
    RCTLinkingManager.getUrlEventHandler(event, withReplyEvent: replyEvent)
  }
  
  override func sourceURL(for bridge: RCTBridge!) -> URL! {
    return bundleURL()
  }
  
  
  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
  
  @IBAction func showHelp(_ sender: Any?) {
    NSWorkspace.shared.open(URL(string: "https://docs.expo.dev/build/orbit/")!)
  }
}
