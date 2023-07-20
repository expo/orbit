//
//  main.swift
//  AutoLauncher
//
//  Created by Gabriel Donadel on 10/07/23.
//

import Cocoa

let delegate = AutoLauncherAppDelegate()
NSApplication.shared.delegate = delegate
_ = NSApplicationMain(CommandLine.argc, CommandLine.unsafeArgv)
