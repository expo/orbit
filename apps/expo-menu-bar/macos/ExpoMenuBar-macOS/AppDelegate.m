#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>

#import "DevViewController.h"

@interface AppDelegate () <RCTBridgeDelegate>
#if RCT_DEV
  @property (nonatomic, strong) NSWindowController *devWindowController;
#endif

@end

@implementation AppDelegate

- (void)awakeFromNib {
  [super awakeFromNib];

  _bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:nil];
}

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
  statusItem = [[NSStatusBar systemStatusBar] statusItemWithLength:NSSquareStatusItemLength];
  NSImage *image = [NSImage imageNamed:@"menu-bar-icon"];
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

- (void)openPopover {
    [popover showRelativeToRect:statusItem.button.bounds
                         ofView:statusItem.button
                  preferredEdge:NSMinYEdge];
    [popover.contentViewController.view.window makeKeyWindow];
    [_bridge enqueueJSCall:@"RCTDeviceEventEmitter.emit"
                            args:@[@"popoverFocused"]];
}

- (void)onPressStatusItem:(id)sender {
  if (popover.isShown) {
    [popover close];
  } else {
    [self openPopover];
  }
}

- (void)applicationWillTerminate:(NSNotification *)aNotification {
  // Insert code here to tear down your application
}

- (void)applicationWillFinishLaunching:(NSNotification *)__unused aNotification
{
  [NSUserNotificationCenter defaultUserNotificationCenter].delegate = self;

  [[NSAppleEventManager sharedAppleEventManager] setEventHandler:self
                                                     andSelector:@selector(getUrlEventHandler:withReplyEvent:)
                                                   forEventClass:kInternetEventClass
                                                      andEventID:kAEGetURL];
}

- (void)getUrlEventHandler:(NSAppleEventDescriptor *)event withReplyEvent:(NSAppleEventDescriptor *)replyEvent
{
    [self openPopover];
    [RCTLinkingManager getUrlEventHandler:event withReplyEvent:replyEvent];
}

- (NSPopover *)popover {
    return popover;
}

#pragma mark - RCTBridgeDelegate Methods

- (NSURL *)sourceURLForBridge:(__unused RCTBridge *)bridge {
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"]; // .jsbundle;
}

@end
