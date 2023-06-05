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


  #if RCT_DEV
    NSStoryboard *storyBoard = [NSStoryboard storyboardWithName:@"Main" bundle:nil];
    self.devWindowController = [storyBoard instantiateControllerWithIdentifier:@"devViewController"];
    [self.devWindowController showWindow:self];
    [self.devWindowController.window makeKeyWindow];
    [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
    [NSApp activateIgnoringOtherApps:YES];
  #endif


}

- (void)onPressStatusItem:(id)sender {
  if (popover.isShown) {
    [popover close];
  } else {
    [_bridge enqueueJSCall:@"RCTDeviceEventEmitter.emit"
                            args:@[@"popoverFocused"]];
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

- (NSPopover *)popover {
    return popover;
}

#pragma mark - RCTBridgeDelegate Methods

- (NSURL *)sourceURLForBridge:(__unused RCTBridge *)bridge {
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"]; // .jsbundle;
}

@end
