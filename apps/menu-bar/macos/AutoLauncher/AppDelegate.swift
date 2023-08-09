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

        if !isRunning {
          guard let mainAppURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: Constants.menuBarBundleID) else { return }
          
          NSWorkspace.shared.openApplication(at: mainAppURL,
                                             configuration: NSWorkspace.OpenConfiguration(),
                                             completionHandler: nil
          )
        }
    }

}
