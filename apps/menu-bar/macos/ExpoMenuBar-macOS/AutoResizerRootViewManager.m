#import "AutoResizerRootViewManager.h"
#import "AutoResizerRootView.h"

#import <React/RCTViewManager.h>


@implementation AutoResizerRootViewManager

RCT_EXPORT_MODULE()

RCT_EXPORT_VIEW_PROPERTY(enabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(maxRelativeHeight, CGFloat)

- (NSView *)view
{
  return [[AutoResizerRootView alloc] init];
}

@end
