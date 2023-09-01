//
//  AppDelegate.swift
//  AutoLauncher
//
//  Created by Gabriel Donadel on 10/07/23.
//

import Cocoa

class AutoLauncherAppDelegate: NSObject, NSApplicationDelegate {
  struct Constants {
    static let menuBarBundleID = "dev.expo.orbit"
  }

  func applicationDidFinishLaunching(_ aNotification: Notification) {
    let runningApps = NSWorkspace.shared.runningApplications
    let isRunning = runningApps.contains {
      $0.bundleIdentifier == Constants.menuBarBundleID
    }

    if !isRunning, let mainAppURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: Constants.menuBarBundleID) {
      NSWorkspace.shared.openApplication(at: mainAppURL, configuration: NSWorkspace.OpenConfiguration()) { (_, error) in
        if let error = error {
          print("Error opening Expo Orbit: \(error)")
        }
        
        DispatchQueue.main.async {
          NSApp.terminate(nil)
        }
      }
    } else {
      NSApp.terminate(nil)
    }
  }
}
