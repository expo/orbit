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
      "appVersion": self.appContext?.constants?.constants()["nativeAppVersion"],
      "buildVersion": self.appContext?.constants?.buildVersion(),
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
    
    AsyncFunction("runCli") { (command: String, arguments: [String], listenerId: Int, promise: Promise) in
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
      
      task.environment = environment
      task.standardOutput = pipe
      task.standardError = pipe
      
      let file = pipe.fileHandleForReading
      var returnOutput = ""
      var hasReachedReturnOutput = false
      var hasReachedError = false
      
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
          
          if hasReachedReturnOutput || hasReachedError {
            returnOutput.append(output)
          } else if output == "---- return output ----" {
            hasReachedReturnOutput = true
          } else if output == "---- thrown error ----" {
            hasReachedError = true
          } else if hasListeners && !output.isEmpty && output != "\n" {
            let eventData = ["listenerId": listenerId, "output": output]
            sendEvent(onCLIOutput, eventData)
          }
        }
      }
      
      task.terminationHandler = { task in
        file.readabilityHandler = nil
        
        if hasReachedError {
          promise.reject(CLIOutputError(returnOutput))
        } else {
          if task.terminationStatus == 0 {
            promise.resolve(hasReachedReturnOutput ? returnOutput : nil)
          } else {
            promise.reject(IntenalCLIError(fullOutput))
          }
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
  
  private func getHardwareArch() -> String? {
    var sysinfo = utsname()
    let result = uname(&sysinfo)
    
    if result != 0 {
      return nil
    }
    
    let machine = withUnsafePointer(to: &sysinfo.machine) {
      $0.withMemoryRebound(to: CChar.self, capacity: Int(_SYS_NAMELEN)) {
        ptr in String(cString: ptr)
      }
    }
    
    return machine
  }
  
  private func getCliResourceNameForArch() -> String {
    return getHardwareArch() == "arm64" ? "orbit-cli-arm64" : "orbit-cli-x64"
  }
}
