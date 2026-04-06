#import "DevViewController.h"
#import "Expo_Orbit-Swift.h"
#import "Expo-Swift.h"

#import <React/RCTRootView.h>

@implementation DevViewController

- (void)viewDidLoad {
  [super viewDidLoad];
 
  RCTReactNativeFactory *reactNativeFactory = [((EXExpoAppDelegate *)[NSApp delegate]) factory];
  RCTPlatformView *rootView = [reactNativeFactory.rootViewFactory viewWithModuleName:@"main"
                                                                  initialProperties:@{@"isDevWindow" : @YES}];

  NSView *view = [self view];
  view.wantsLayer = YES;
  view.layer.backgroundColor = [NSColor windowBackgroundColor].CGColor;

  [view addSubview:rootView];
  [rootView setFrame:[view bounds]];
  [rootView setAutoresizingMask:(NSViewMinXMargin | NSViewMaxXMargin | NSViewMinYMargin | NSViewMaxYMargin | NSViewWidthSizable | NSViewHeightSizable)];
}

@end
