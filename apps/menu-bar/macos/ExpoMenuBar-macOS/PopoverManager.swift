import Cocoa
import React_RCTAppDelegate

class PopoverManager: NSObject {
  @objc public static private(set) var shared: PopoverManager!

  @objc public var delegate: RCTAppDelegate
  private var statusItem: NSStatusItem!
  @objc var popover: NSPopover!

  @objc public static func initializeShared(delegate: RCTAppDelegate) -> PopoverManager {
    if shared == nil {
      shared = PopoverManager(delegate: delegate)
    }
    return shared
  }

  init(delegate: RCTAppDelegate) {
    self.delegate = delegate
    super.init()

    self.setupPopover()
    self.setupStatusItem()
  }

  private func setupStatusItem() {
    statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

    let dragDropView = DragDropStatusItemView(frame: NSRect(x: 0, y: 0, width: 22, height: 22))!
    dragDropView.openPopoverAction = { [weak self] in
      self?.openPopover()
    }

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
      keyEquivalent: ""
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
        "windowStyle": ["titlebarAppearsTransparent": true, "height": 660.0, "width": 500.0]
      ])
  }

  @objc private func quitAction(_ sender: Any?) {
    NSApp.terminate(nil)
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

    delegate.bridge?.enqueueJSCall(
      "RCTDeviceEventEmitter.emit", args: ["popoverFocused", ["screenSize": screenSize]])
  }

  @objc func closePopover() {
    popover.close()
  }

  @objc func setPopoverContentSize(_ size: NSSize) {
    popover.contentSize = size
    popover.contentViewController?.view.frame.size = size
  }
}
