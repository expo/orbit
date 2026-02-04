#import <Cocoa/Cocoa.h>
#import <React/RCTRootView.h>

#import "RNMultiWindow.h"
#import "RNMultiWindowNavigator.h"

@implementation RNMultiWindow

RCT_EXPORT_MODULE();

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
  RNMultiWindowNavigator *windowNavigator = [RNMultiWindowNavigator shared];
  [windowNavigator openWindow:moduleName options:options];
}

RCT_EXPORT_METHOD(closeWindow:(NSString *)moduleName)
{
  RNMultiWindowNavigator *windowNavigator = [RNMultiWindowNavigator shared];
  [windowNavigator closeWindow:moduleName];
}

@end
