#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

#import "DevViewController.h"
#import "Expo_Orbit-Swift.h"

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
  httpServer = [[SwifterWrapper alloc] init];

  self.moduleName = @"main";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super applicationDidFinishLaunching:notification];
}

- (void)loadReactNativeWindow:(NSDictionary *)launchOptions
{
  RCTPlatformView *rootView = [self.rootViewFactory viewWithModuleName:self.moduleName
                                                     initialProperties:self.initialProps
                                                         launchOptions:launchOptions];
  NSViewController *rootViewController = [[NSViewController alloc] init];
  rootViewController.view = rootView;

  popoverManager = [PopoverManager initializeSharedWithDelegate:self];
  [popoverManager setContentViewController:rootViewController];

#ifdef SHOW_DEV_WINDOW
  #if RCT_DEV
    NSStoryboard *storyBoard = [NSStoryboard storyboardWithName:@"Main" bundle:nil];
    self.devWindowController = [storyBoard instantiateControllerWithIdentifier:@"devViewController"];
    [self.devWindowController showWindow:self];
    [self.devWindowController.window makeKeyWindow];
  #endif
#endif

#ifdef SHOW_DOCK_ICON
  #if RCT_DEV
    [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
  #endif
#endif

  [NSApp activateIgnoringOtherApps:YES];
}

- (void)customizeRootView:(RCTUIView *)rootView
{
  rootView.backgroundColor = [NSColor clearColor];
}

- (BOOL)application:(NSApplication *)_ openFile:(NSString *)filename
{
  [popoverManager openPopover];
  [NSNotificationCenter.defaultCenter postNotificationName:@"ExpoOrbit_OnOpenFile" object:filename];
  return  YES;
}

- (void)applicationWillFinishLaunching:(NSNotification *)__unused aNotification
{
  [NSUserNotificationCenter defaultUserNotificationCenter].delegate = self;

  [[NSAppleEventManager sharedAppleEventManager] setEventHandler:self
                                                     andSelector:@selector(getUrlEventHandler:withReplyEvent:)
                                                   forEventClass:kInternetEventClass
                                                      andEventID:kAEGetURL];
}

// Called when the user tries to reopen the app from the Dock or Spotlight
- (BOOL)applicationShouldHandleReopen:(NSApplication *)sender hasVisibleWindows:(BOOL)visibleWindows {
    if (!visibleWindows) {
      [popoverManager openPopover];
    }

    return YES;
}

- (void)getUrlEventHandler:(NSAppleEventDescriptor *)event withReplyEvent:(NSAppleEventDescriptor *)replyEvent
{
    [popoverManager openPopover];
    [RCTLinkingManager getUrlEventHandler:event withReplyEvent:replyEvent];
}


#pragma mark - RCTBridgeDelegate Methods

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
#ifdef RN_FABRIC_ENABLED
  return true;
#else
  return false;
#endif
}

- (IBAction)showHelp:(id)sender {
  [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:@"https://docs.expo.dev/build/orbit/"]];
}

@end
