#import "WindowsManager.h"
#import <Cocoa/Cocoa.h>
#import <React/RCTRootView.h>

#import "AppDelegate.h"
#import "WindowWithDeallocCallback.h"


@implementation WindowsManager

RCT_EXPORT_MODULE();

@synthesize bridge = _bridge;

- (instancetype)init {
    self = [super init];
    if (self) {
      _windowsMap = [NSMutableDictionary dictionary];
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}


RCT_EXPORT_METHOD(createWindow:(NSString *)moduleName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    
    NSWindow *window = self->_windowsMap[moduleName];
    
    if (window == nil) {
      NSRect windowFrame = NSMakeRect(600, 100, 400, 300);
      NSWindowStyleMask windowStyle = NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskResizable;
      WindowWithDeallocCallback *newWindow = [[WindowWithDeallocCallback alloc] initWithContentRect:windowFrame styleMask:windowStyle backing:NSBackingStoreBuffered defer:NO];
      newWindow.deallocCallback = ^{
        [self->_windowsMap removeObjectForKey:moduleName];
      };
      newWindow.title = moduleName;
      RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:self->_bridge
                                                        moduleName:moduleName
                                                 initialProperties:@{}];
     
      newWindow.contentView = rootView;
      [self->_windowsMap setObject:newWindow forKey:moduleName];
      window = newWindow;
    }
    
    NSApplication *application = [NSApplication sharedApplication];
    [application activateIgnoringOtherApps:YES];
    [window makeKeyAndOrderFront:nil];
  });
}


@end
 
