#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>

#import "DevViewController.h"
#import "WindowNavigator.h"
#import "Expo_Orbit-Swift.h"
#import "DragDropStatusItemView.h"


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
  DragDropStatusItemView *dragDropView = [[DragDropStatusItemView alloc] initWithFrame:NSMakeRect(0, 0, 22, 22)];
   dragDropView.openPopoverAction = ^{
     [self openPopover];
   };
  [statusItem.button addSubview:dragDropView];
  [statusItem.button setTarget:self];
  [statusItem.button sendActionOn:NSEventMaskRightMouseUp | NSEventMaskLeftMouseUp];
  [statusItem.button setAction:@selector(onPressStatusItem:)];

  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:_bridge
                                                moduleName:@"main"
                                        initialProperties:@{}];

  NSViewController *rootViewController = [[NSViewController alloc] init];
  rootViewController.view = rootView;

  popover = [[NSPopover alloc] init];
  popover.contentSize = NSMakeSize(380, 450);
  popover.contentViewController = rootViewController;
  popover.behavior = NSPopoverBehaviorTransient;
  [self addPopoverObservers];

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

  httpServer = [[SwifterWrapper alloc] init];
}

- (BOOL)application:(NSApplication *)_ openFile:(NSString *)filename
{
  [self openPopover];

  [NSNotificationCenter.defaultCenter postNotificationName:@"ExpoOrbit_OnOpenFile" object:filename];
  return  YES;
}

- (NSMenu *)createContextMenu {
    NSMenu *menu = [[NSMenu alloc] initWithTitle:@"My Menu"];

    [menu addItemWithTitle:@"Settings..." action:@selector(settingsAction:) keyEquivalent:@""];
    [menu addItemWithTitle:@"Quit" action:@selector(quitAction:) keyEquivalent:@"q"];

    return menu;
}


- (void)quitAction:(id)sender {
  exit(0);
}


- (void)settingsAction:(id)sender {
  WindowNavigator *windowNavigator = [WindowNavigator shared];
  [windowNavigator openWindow:@"Settings" options:@{
    @"windowStyle": @{
      @"titlebarAppearsTransparent": @YES,
      @"height": @(580.0),
      @"width": @(500.0)
    }
  }];
}

- (void)openPopover {
  [popover showRelativeToRect:statusItem.button.bounds
                       ofView:statusItem.button
                preferredEdge:NSMinYEdge];
  [popover.contentViewController.view.window makeKeyWindow];
  [_bridge enqueueJSCall:@"RCTDeviceEventEmitter.emit"
                    args:@[@"popoverFocused", @{
                      @"screenSize": @{
                        @"height":  @([[NSScreen mainScreen] frame].size.height),
                        @"width":  @([[NSScreen mainScreen] frame].size.width)
                      }
                    }]];
}

- (void)closePopover {
    [popover close];
}

- (void)setPopoverContentSize:(NSSize)size {
  [popover setContentSize:size];
  [popover.contentViewController.view setFrameSize:size];
}

- (void)addPopoverObservers {
  NSNotificationCenter *notificationCenter = NSNotificationCenter.defaultCenter;
  __weak typeof(self) weakSelf = self;

  [notificationCenter addObserverForName:@"ExpoOrbit_OpenPopover" object:nil queue:nil usingBlock:^(NSNotification * _Nonnull notification) {
    [weakSelf openPopover];
  }];
  [notificationCenter addObserverForName:@"ExpoOrbit_ClosePopover" object:nil queue:nil usingBlock:^(NSNotification * _Nonnull notification) {
    [weakSelf closePopover];
  }];
}

- (void)onPressStatusItem:(id)sender {
  NSEvent *event = [NSApp currentEvent];
  if (event.type == NSEventTypeRightMouseUp) {
    NSMenu *contextMenu = [self createContextMenu];
    [statusItem popUpStatusItemMenu:contextMenu];
    return;
  }

  if (popover.isShown) {
    [self closePopover];
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

// Called when the user tries to reopen the app from the Dock or Spotlight
- (BOOL)applicationShouldHandleReopen:(NSApplication *)sender hasVisibleWindows:(BOOL)visibleWindows {
    if (!visibleWindows) {
      [self openPopover];
    }

    return YES;
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

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (IBAction)showHelp:(id)sender {
  [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:@"https://docs.expo.dev/build/orbit/"]];
}

@end
