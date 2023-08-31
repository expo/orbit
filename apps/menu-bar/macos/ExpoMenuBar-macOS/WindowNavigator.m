#import <Cocoa/Cocoa.h>
#import <React/RCTRootView.h>

#import "WindowWithDeallocCallback.h"
#import "WindowNavigator.h"
#import "AppDelegate.h"

@implementation WindowNavigator

+ (instancetype)shared {
  static WindowNavigator *sharedInstance = nil;
  static dispatch_once_t onceToken;

  dispatch_once(&onceToken, ^{
    sharedInstance = [[self alloc] init];
  });

  return sharedInstance;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    _windowsMap = [NSMutableDictionary dictionary];
  }
  return self;
}

- (void)openWindow:(NSString *)moduleName options:(NSDictionary *)options {
  dispatch_async(dispatch_get_main_queue(), ^{
    if(self->_windowsMap.count == 0){
      [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
    }
    
    NSWindow *window = self->_windowsMap[moduleName];
    NSString *title = options[@"title"] ?: moduleName;

    NSDictionary *windowStyle = options[@"windowStyle"];
    NSWindowStyleMask windowStyleMask = [windowStyle objectForKey:@"mask"] ? [windowStyle[@"mask"] unsignedIntegerValue] : NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskResizable;
    CGFloat width = [windowStyle[@"width"] ?: @(400) floatValue];
    CGFloat height = [windowStyle[@"height"] ?: @(300) floatValue];
    BOOL titlebarAppearsTransparent = [windowStyle[@"titlebarAppearsTransparent"] boolValue];

    NSRect screenRect = [[NSScreen mainScreen] visibleFrame];
    CGFloat screenWidth = NSWidth(screenRect);
    CGFloat screenHeight = NSHeight(screenRect);

    CGFloat originX = (screenWidth - width) / 2.0;
    CGFloat originY = (screenHeight - height) / 2.0;

    if (window == nil) {
      NSRect windowFrame = NSMakeRect(originX, originY, width, height);
      WindowWithDeallocCallback *newWindow = [[WindowWithDeallocCallback alloc] initWithContentRect:windowFrame styleMask:windowStyleMask backing:NSBackingStoreBuffered defer:NO];

      newWindow.deallocCallback = ^{
        [self->_windowsMap removeObjectForKey:moduleName];
        if(self->_windowsMap.count == 0){
          [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
        }
      };

      RCTBridge *bridge = [((AppDelegate *)[NSApp delegate])bridge];
      RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                       moduleName:moduleName
                                                initialProperties:@{}];
      newWindow.contentView = rootView;
      [self->_windowsMap setObject:newWindow forKey:moduleName];
      window = newWindow;
    }else{
      NSRect contentRect = [window contentRectForFrameRect:[window frame]];
      if(contentRect.size.width != width || contentRect.size.height != height){
        CGFloat titleBarHeight = [window frame].size.height - contentRect.size.height;
        NSRect newFrame = NSMakeRect(originX, originY, width, height + titleBarHeight);
        [window setFrame:newFrame display:YES];
      }
    }

    window.title = title;
    [window setTitlebarAppearsTransparent:titlebarAppearsTransparent];
    if(window.styleMask != windowStyleMask){
      [window setStyleMask:windowStyleMask];
      [window display];
    }

    NSApplication *application = [NSApplication sharedApplication];
    [application activateIgnoringOtherApps:YES];
    if (![window isKeyWindow]) {
      [window makeKeyAndOrderFront:nil];
    }
  });
}

- (void) closeWindow:(NSString *)moduleName {
  dispatch_async(dispatch_get_main_queue(), ^{
    NSWindow *window = [self->_windowsMap objectForKey:moduleName];
    [window close];
  });
}

@end
