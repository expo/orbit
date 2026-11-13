import Cocoa
import React_RCTAppDelegate
internal import Expo

class PopoverManager: NSObject {
  @objc public static private(set) var shared: PopoverManager!

  private var reactNativeFactory: RCTReactNativeFactory
  private var statusItem: NSStatusItem!
  private var statusItemView: DragDropStatusItemView?
  @objc var popover: NSPopover!

  @objc public static func initializeShared(factory: RCTReactNativeFactory) -> PopoverManager {
    if shared == nil {
      shared = PopoverManager(factory: factory)
    }
    return shared
  }

  init(factory: RCTReactNativeFactory) {
    self.reactNativeFactory = factory
    super.init()

    self.setupPopover()
    self.setupStatusItem()
    self.setupSettingsShortcut()
  }

  // Command-comma opens Settings, as in other macOS apps. The main menu of the storyboard has
  // the "Settings…" item with that key. It has no action there, so it gets one here.
  private func setupSettingsShortcut() {
    let items = NSApp.mainMenu?.items.compactMap { $0.submenu }.flatMap { $0.items } ?? []
    if let settingsItem = items.first(where: { $0.keyEquivalent == "," }) {
      settingsItem.target = self
      settingsItem.action = #selector(settingsAction)
    }

    // "Quit Orbit" (Command-Q) asks about running remote sessions, like the Quit row of the
    // popover.
    if let quitItem = items.first(where: { $0.keyEquivalent == "q" }) {
      quitItem.target = self
      quitItem.action = #selector(quitAction(_:))
    }

    // Command-W closes the window that has the focus, for example Settings. The storyboard
    // has no File or Window menu, so the item goes into the app menu, before "Quit".
    if let appMenu = NSApp.mainMenu?.items.first?.submenu,
      !appMenu.items.contains(where: { $0.keyEquivalent == "w" })
    {
      let closeItem = NSMenuItem(
        title: "Close Window",
        action: #selector(NSWindow.performClose(_:)),
        keyEquivalent: "w"
      )
      let quitIndex = appMenu.items.firstIndex(where: { $0.keyEquivalent == "q" })
      appMenu.insertItem(closeItem, at: quitIndex ?? appMenu.items.count)
    }
  }

  private func setupStatusItem() {
    statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

    let dragDropView = DragDropStatusItemView(frame: NSRect(x: 0, y: 0, width: 22, height: 22))!
    dragDropView.openPopoverAction = { [weak self] in
      self?.openPopover()
    }
    statusItemView = dragDropView

    let button = statusItem.button!
    button.addSubview(dragDropView)
    button.target = self
    button.sendAction(on: .init([.leftMouseUp, .rightMouseUp]))
    button.action = #selector(handleStatusItemClick(_:))
  }

  private func setupPopover() {
    popover = NSPopover()
    popover.contentSize = NSSize(width: 380, height: 450)
    popover.behavior = .transient
    setupObservers()
  }

  private func setupObservers() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(openPopover),
      name: Notification.Name("ExpoOrbit_OpenPopover"),
      object: nil
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(closePopover),
      name: Notification.Name("ExpoOrbit_ClosePopover"),
      object: nil
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(setStatusItemBadge(_:)),
      name: Notification.Name("ExpoOrbit_SetStatusItemBadge"),
      object: nil
    )
  }

  @objc private func setStatusItemBadge(_ notification: Notification) {
    statusItemView?.badgeText = notification.object as? String
  }

  // MARK: - Event Handling

  @objc private func handleStatusItemClick(_ sender: Any?) {
    guard let event = NSApp.currentEvent else { return }

    if event.type == .rightMouseUp {
      showContextMenu()
    } else {
      popover.isShown ? closePopover() : openPopover()
    }
  }

  private func showContextMenu() {
    let menu = NSMenu()

    let settingsItem = NSMenuItem(
      title: "Settings...",
      action: #selector(settingsAction),
      keyEquivalent: ","
    )
    settingsItem.target = self

    let quitItem = NSMenuItem(
      title: "Quit",
      action: #selector(quitAction(_:)),
      keyEquivalent: "q"
    )
    quitItem.target = self

    menu.addItem(settingsItem)
    menu.addItem(quitItem)
    statusItem.popUpMenu(menu)
  }

  // MARK: - Actions

  @objc private func settingsAction() {
    WindowNavigator.shared().openWindow(
      "Settings",
      options: [
        "title": "Settings",
        "windowStyle": [
          "mask": NSWindow.StyleMask([.titled, .closable, .fullSizeContentView]).rawValue,
          "titlebarAppearsTransparent": true,
          "titleVisibility": "hidden",
          "toolbar": true,
          "height": 520.0,
          "width": 680.0,
        ],
      ])
  }

  // Quit goes to JavaScript, which asks about running remote sessions before it exits. This
  // is the action of the right-click menu and of "Quit Orbit" (Command-Q) in the main menu.
  @objc private func quitAction(_ sender: Any?) {
    if let reactHost = reactNativeFactory.rootViewFactory.value(forKey: "reactHost"),
      let wrapper = RCTHostWrapper(host: reactHost)
    {
      wrapper.callFunction(
        onJSModule: "RCTDeviceEventEmitter",
        method: "emit",
        args: ["quitRequested", [:] as [String: Any]]
      )
    } else {
      NSApp.terminate(nil)
    }
  }

  // MARK: - Public Interface

  @objc func setContentViewController(_ viewController: NSViewController) {
    popover.contentViewController = viewController
  }

  // MARK: - Popover Management
  @objc func openPopover() {
    guard let button = statusItem.button else { return }

    popover.show(
      relativeTo: button.bounds,
      of: button,
      preferredEdge: .minY)
    popover.contentViewController?.view.window?.makeKey()

    let screenSize: [String: Any] = [
      "height": NSScreen.main?.frame.height ?? 0,
      "width": NSScreen.main?.frame.width ?? 0
    ]


    if let reactHost = reactNativeFactory.rootViewFactory.value(forKey: "reactHost") {
      let wrapper = RCTHostWrapper(host: reactHost)
      wrapper?.callFunction(
        onJSModule: "RCTDeviceEventEmitter",
        method: "emit",
        args: ["popoverFocused", ["screenSize": screenSize]]
      )
    }
  }

  @objc func closePopover() {
    popover.close()
  }

  @objc func setPopoverContentSize(_ size: NSSize) {
    popover.contentSize = size
    popover.contentViewController?.view.frame.size = size
  }
}
