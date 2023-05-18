#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>

@interface AppDelegate () <RCTBridgeDelegate>

@end

@implementation AppDelegate

- (void)awakeFromNib {
  [super awakeFromNib];

  _bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:nil];
}

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
  statusItem = [[NSStatusBar systemStatusBar] statusItemWithLength:NSSquareStatusItemLength];
  NSImage *image = [NSImage imageNamed:@"icon"];
  [image setTemplate:YES];
  statusItem.button.image = image;
  [statusItem.button setTarget:self];
  [statusItem.button setAction:@selector(onPressStatusItem:)];

  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:_bridge
                                                moduleName:@"ExpoMenuBar"
                                        initialProperties:@{}];

  NSViewController *rootViewController = [[NSViewController alloc] init];
  rootViewController.view = rootView;

  popover = [[NSPopover alloc] init];
  popover.contentViewController = rootViewController;
  popover.behavior = NSPopoverBehaviorTransient;
}

- (void)onPressStatusItem:(id)sender {
  if (popover.isShown) {
    [popover close];
  } else {
    [popover showRelativeToRect:statusItem.button.bounds
                         ofView:statusItem.button
                  preferredEdge:NSMinYEdge];
    [popover.contentViewController.view.window makeKeyWindow];
  }
}

- (void)applicationWillTerminate:(NSNotification *)aNotification {
  // Insert code here to tear down your application
}

- (void)applicationWillFinishLaunching:(NSNotification *)__unused aNotification
{
  [NSUserNotificationCenter defaultUserNotificationCenter].delegate = self;

  [[NSAppleEventManager sharedAppleEventManager] setEventHandler:[RCTLinkingManager class]
                                                     andSelector:@selector(getUrlEventHandler:withReplyEvent:)
                                                   forEventClass:kInternetEventClass
                                                      andEventID:kAEGetURL];
}

#pragma mark - RCTBridgeDelegate Methods

- (NSURL *)sourceURLForBridge:(__unused RCTBridge *)bridge {
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"]; // .jsbundle;
}

@end
