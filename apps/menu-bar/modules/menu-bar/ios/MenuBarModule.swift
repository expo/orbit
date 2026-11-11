import ExpoModulesCore
import ServiceManagement

private let onNewCommandLine = "onNewCommandLine"
private let onCLIOutput = "onCLIOutput"

public class MenuBarModule: Module {
  private var hasListeners = false
  
  public func definition() -> ModuleDefinition {
    Name("MenuBar")
    
    Events(onNewCommandLine, onCLIOutput)

    Constants([
      "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
      "buildVersion": Bundle.main.infoDictionary?["CFBundleVersion"] as? String,
      "initialScreenSize": [
        "width": NSScreen.main?.frame.width,
        "height": NSScreen.main?.frame.height
      ],
      "homedir": NSHomeDirectory(),
    ])
    
    Function("exitApp") {
      exit(0)
    }
    
    AsyncFunction("runCommand") { (command: String, arguments: [String]) -> String in
      let task = Process()
      let pipe = Pipe()
      
      task.executableURL = URL(string: "/bin/sh")
      task.arguments = ["-l", "-c", "PATH=\"$PATH:/usr/local/bin\"; \(command) \(arguments.joined(separator: " "))"]
      task.standardOutput = pipe
      task.standardError = pipe
      
      let file = pipe.fileHandleForReading
      var returnOutput = ""
      
      try task.run()
      
      let notificationCenter = NotificationCenter.default
      
      notificationCenter.addObserver(forName: FileHandle.readCompletionNotification, object: file, queue: nil) { [weak self] notifiction in
        guard let self else {
          return
        }
        guard let chunk = notifiction.userInfo?[NSFileHandleNotificationDataItem] as? Data else {
          return
        }
        let wholeOutput = String(data: chunk, encoding: .utf8)
        guard let outputs = wholeOutput?.components(separatedBy: .newlines) else {
          return
        }
        
        for output in outputs {
          if output.isEmpty {
            continue
          }
          
          returnOutput = returnOutput.appending(output)
          if hasListeners && !output.isEmpty && output != "\n" {
            sendEvent(onNewCommandLine,
                    ["output": output]
            )
          }
        }
        
        file.readInBackgroundAndNotify()
      }
      
      notificationCenter.addObserver(forName: Process.didTerminateNotification, object: task, queue: nil) { notification in
        notificationCenter.removeObserver(self)
      }
      
      file.readInBackgroundAndNotify()
      task.waitUntilExit()
      return returnOutput
    }
    
    AsyncFunction("runCli") { (command: String, arguments: [String], listenerId: Int, transientEnvVars: [String: String]?, promise: Promise) in
      let task = Process()
      let pipe = Pipe()
      
      task.executableURL = Bundle.main.url(forResource: getCliResourceNameForArch(), withExtension: nil)
      task.arguments = [command] + arguments

      var environment = ProcessInfo.processInfo.environment
      environment["EXPO_MENU_BAR"] = "true"

      if let envVars = UserDefaults.standard.object(forKey: "envVars") as? Dictionary<String, String> {
        if envVars.count > 0 {
          environment = environment.merging(envVars) { _, new in
            new
          }
        }
      }

      if let transientEnvVars = transientEnvVars {
        environment = environment.merging(transientEnvVars) { _, new in
          new
        }
      }

      task.environment = environment
      task.standardOutput = pipe
      task.standardError = pipe

      let file = pipe.fileHandleForReading
      var accumulatedOutput = ""

      file.readabilityHandler = { [weak self] handle in
        guard let self else {
          return
        }

        let availableData = handle.availableData
        let wholeOutput = String(data: availableData, encoding: .utf8)
        guard let outputs = wholeOutput?.components(separatedBy: .newlines) else {
          return
        }

        for output in outputs {
          if output.isEmpty {
            continue
          }
          accumulatedOutput.append(output + "\n")

          if hasListeners && !output.isEmpty && output != "\n"
              && !isCliOutputMarker(output) {
            let eventData = ["listenerId": listenerId, "output": output]
            sendEvent(onCLIOutput, eventData)
          }
        }
      }

      task.terminationHandler = { task in
        file.readabilityHandler = nil

        let result = parseCliOutput(accumulatedOutput)

        if let error = result.error {
          promise.reject(CLIOutputError(error))
        } else if task.terminationStatus == 0 {
          promise.resolve(result.returnOutput)
        } else {
          promise.reject(IntenalCLIError(result.fullOutput))
        }
      }

      try task.run()
    }
    
    AsyncFunction("setLoginItemEnabled") { (enabled: Bool) in
      guard SMLoginItemSetEnabled("dev.expo.AutoLauncher" as CFString, enabled) else {
        throw LauncherError()
      }
    }
    
    AsyncFunction("showMultiOptionAlert") { (title: String, message: String, options: [String]) -> Int in
      let alert = NSAlert()
      alert.messageText = title
      alert.informativeText = message
      alert.addButton(withTitle: "OK")
      alert.addButton(withTitle: "Cancel")
      
      let popupButton = NSPopUpButton(frame: NSRect(x: 0, y: 0, width: 250, height: 24), pullsDown: false)
      popupButton.addItems(withTitles: options)
      alert.accessoryView = popupButton
      
      if alert.runModal() == .alertFirstButtonReturn {
        return popupButton.indexOfSelectedItem
      }
      throw MultiOptionError()
    }.runOnQueue(.main)
    
    // Shows a menu at the pointer. Returns the index of the chosen item, or -1 when the user
    // dismisses the menu.
    AsyncFunction("showMenu") { (items: [[String: Any]]) -> Int in
      let target = MenuTarget()
      let menu = NSMenu()
      menu.autoenablesItems = false
      fillMenu(menu, items: items, target: target)
      openMenu = menu
      openMenuTarget = target
      // `popUp` returns when the menu closes; the item's action has run by then.
      menu.popUp(positioning: nil, at: NSEvent.mouseLocation, in: nil)
      if openMenu === menu {
        openMenu = nil
        openMenuTarget = nil
      }
      return target.chosenIndex
    }.runOnQueue(.main)

    // Replaces the items of the menu that `showMenu` opened, while it is open. For a menu that
    // opens with a "Loading…" item. An empty list closes the menu. Does nothing when no menu
    // is open.
    AsyncFunction("updateMenu") { (items: [[String: Any]]) in
      // An open menu runs the main run loop in the event tracking mode. A block for the
      // common modes runs in that mode too, so the change gets to the open menu.
      CFRunLoopPerformBlock(CFRunLoopGetMain(), CFRunLoopMode.commonModes.rawValue) {
        guard let menu = openMenu, let target = openMenuTarget else { return }
        if items.isEmpty {
          // No items: close the menu.
          menu.cancelTracking()
          return
        }
        menu.removeAllItems()
        fillMenu(menu, items: items, target: target)
        menu.update()
      }
      CFRunLoopWakeUp(CFRunLoopGetMain())
    }

    AsyncFunction("openSystemSettingsLoginItems") {
      if #available(macOS 13.0, *) {
        SMAppService.openSystemSettingsLoginItems()
      } else {
        if let url = URL(string: "x-apple.systempreferences:com.apple.LoginItems-Settings.extension") {
          NSWorkspace.shared.open(url)
        }
      }
    }
    
    AsyncFunction("setEnvVars") { (envVars: [String: String]) in
      UserDefaults.standard.setValue(envVars, forKey: "envVars")
    }
    
    // Run on the main queue because NotificationCenter needs to post from the same queue it will receive on
    AsyncFunction("openPopover") {
      NotificationCenter.default.post(name: NSNotification.Name(rawValue: "ExpoOrbit_OpenPopover"), object: nil)
    }.runOnQueue(.main)
    
    AsyncFunction("closePopover") {
      NotificationCenter.default.post(name: NSNotification.Name(rawValue: "ExpoOrbit_ClosePopover"), object: nil)
    }.runOnQueue(.main)
    
    OnStartObserving {
      hasListeners = true
    }
    
    OnStopObserving {
      hasListeners = false
    }
  }
  
}

// The menu that `showMenu` opened and that is still open.
private var openMenu: NSMenu?
private var openMenuTarget: MenuTarget?

private func fillMenu(_ menu: NSMenu, items: [[String: Any]], target: MenuTarget) {
  for (index, item) in items.enumerated() {
    if item["separator"] as? Bool == true {
      menu.addItem(.separator())
      continue
    }
    if item["header"] as? Bool == true {
      let title = item["title"] as? String ?? ""
      if #available(macOS 14.0, *) {
        menu.addItem(.sectionHeader(title: title))
      } else {
        let header = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        header.isEnabled = false
        menu.addItem(header)
      }
      continue
    }
    let menuItem = NSMenuItem(title: item["title"] as? String ?? "", action: #selector(MenuTarget.choose(_:)), keyEquivalent: "")
    menuItem.target = target
    menuItem.tag = index
    menuItem.state = item["checked"] as? Bool == true ? .on : .off
    menuItem.isEnabled = item["disabled"] as? Bool != true
    if let detail = item["detail"] as? String, !detail.isEmpty {
      let title = NSMutableAttributedString(string: menuItem.title, attributes: [.font: NSFont.menuFont(ofSize: 0)])
      title.append(NSAttributedString(string: " · \(detail)", attributes: [
        .font: NSFont.menuFont(ofSize: 0),
        .foregroundColor: NSColor.secondaryLabelColor
      ]))
      menuItem.attributedTitle = title
    }
    menu.addItem(menuItem)
  }
}

private class MenuTarget: NSObject {
  var chosenIndex = -1

  @objc func choose(_ sender: NSMenuItem) {
    chosenIndex = sender.tag
  }
}
