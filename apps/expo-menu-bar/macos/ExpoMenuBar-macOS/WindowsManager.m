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

- (NSDictionary *)constantsToExport
{
  return @{
     @"STYLE_MASK_BORDERLESS": @(NSWindowStyleMaskBorderless),
     @"STYLE_MASK_TITLED": @(NSWindowStyleMaskTitled),
     @"STYLE_MASK_CLOSABLE": @(NSWindowStyleMaskClosable),
     @"STYLE_MASK_MINIATURIZABLE": @(NSWindowStyleMaskMiniaturizable),
     @"STYLE_MASK_RESIZABLE": @(NSWindowStyleMaskResizable),
     @"STYLE_MASK_UNIFIED_TITLE_AND_TOOLBAR": @(NSWindowStyleMaskUnifiedTitleAndToolbar),
     @"STYLE_MASK_FULL_SCREEN": @(NSWindowStyleMaskFullScreen),
     @"STYLE_MASK_FULL_SIZE_CONTENT_VIEW": @(NSWindowStyleMaskFullSizeContentView),
     @"STYLE_MASK_UTILITY_WINDOW": @(NSWindowStyleMaskUtilityWindow),
     @"STYLE_MASK_DOC_MODAL_WINDOW": @(NSWindowStyleMaskDocModalWindow),
     @"STYLE_MASK_NONACTIVATING_PANEL": @(NSWindowStyleMaskNonactivatingPanel)
   };
}


RCT_EXPORT_METHOD(openWindow:(NSString *)moduleName
                  options:(NSDictionary *)options)
{
  dispatch_async(dispatch_get_main_queue(), ^{
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
      };
      RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:self->_bridge
                                                        moduleName:moduleName
                                                 initialProperties:@{}];
      newWindow.contentView = rootView;
      [self->_windowsMap setObject:newWindow forKey:moduleName];
      window = newWindow;
    }else{
      NSRect currentFrame = [window frame];
      if(currentFrame.size.width != width || currentFrame.size.height != height){
        NSRect newFrame = NSMakeRect(originX, originY, width, height);
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


@end

