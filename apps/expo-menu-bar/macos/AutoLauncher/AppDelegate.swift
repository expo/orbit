//
//  AppDelegate.swift
//  AutoLauncher
//
//  Created by Gabriel Donadel on 10/07/23.
//

import Cocoa

class AutoLauncherAppDelegate: NSObject, NSApplicationDelegate {

    struct Constants {
        static let menuBarBundleID = "dev.expo.MenuBar"
    }

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        let runningApps = NSWorkspace.shared.runningApplications
        let isRunning = runningApps.contains {
            $0.bundleIdentifier == Constants.menuBarBundleID
        }

        if !isRunning {
            var path = Bundle.main.bundlePath as NSString
            for _ in 1...4 {
                path = path.deletingLastPathComponent as NSString
            }
            let applicationPathString = path as String
            guard let pathURL = URL(string: applicationPathString) else { return }
            NSWorkspace.shared.openApplication(at: pathURL,
                                               configuration: NSWorkspace.OpenConfiguration(),
                                               completionHandler: nil)
        }
    }

}
