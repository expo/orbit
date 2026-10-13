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
      // Bytes read so far that do not end a line yet. A chunk can stop mid-line or even
      // mid-UTF-8 sequence, so only whole lines are decoded and forwarded.
      var pendingData = Data()
      // The process can exit before its last chunk (the return marker and the JSON result)
      // has been read from the pipe, so wait for both the pipe EOF and the exit before
      // parsing. The CLI never leaves a child holding its stdout open, so EOF always comes.
      let done = DispatchGroup()
      done.enter() // pipe EOF
      done.enter() // process exit

      let consume = { [weak self] (data: Data) in
        guard let wholeOutput = String(data: data, encoding: .utf8) else {
          return
        }

        for output in wholeOutput.components(separatedBy: .newlines) {
          if output.isEmpty {
            continue
          }
          accumulatedOutput.append(output + "\n")

          if let self, self.hasListeners, !isCliOutputMarker(output) {
            let eventData = ["listenerId": listenerId, "output": output]
            self.sendEvent(onCLIOutput, eventData)
          }
        }
      }

      file.readabilityHandler = { handle in
        let availableData = handle.availableData
        if availableData.isEmpty {
          // EOF: flush whatever did not end with a newline and stop reading.
          handle.readabilityHandler = nil
          consume(pendingData)
          done.leave()
          return
        }

        pendingData.append(availableData)
        guard let newline = pendingData.lastIndex(of: UInt8(ascii: "\n")) else {
          return
        }
        consume(pendingData[...newline])
        pendingData = Data(pendingData[(newline + 1)...])
      }

      task.terminationHandler = { _ in
        done.leave()
      }

      done.notify(queue: .global()) {
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
