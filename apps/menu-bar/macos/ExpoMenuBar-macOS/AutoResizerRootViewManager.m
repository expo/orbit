#import "AutoResizerRootViewManager.h"
#import "AutoResizerRootView.h"

#import <React/RCTViewManager.h>


@implementation AutoResizerRootViewManager

RCT_EXPORT_MODULE()

RCT_EXPORT_VIEW_PROPERTY(enabled, BOOL)

- (NSView *)view
{
  return [[AutoResizerRootView alloc] init];
}

@end
