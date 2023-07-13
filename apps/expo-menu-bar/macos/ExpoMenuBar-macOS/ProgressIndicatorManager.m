#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>
#import <React/RCTConvert.h>

#import "ProgressIndicatorManager.h"
#import "ProgressIndicatorView.h"

@implementation RCTConvert (UIActivityIndicatorView)

RCT_ENUM_CONVERTER(
    UIActivityIndicatorViewStyle,
    (@{
      @"large" : @(UIActivityIndicatorViewStyleWhiteLarge),
      @"small" : @(UIActivityIndicatorViewStyleWhite),
    }),
    UIActivityIndicatorViewStyleWhiteLarge,
    integerValue)

@end

@implementation ProgressIndicatorManager

RCT_EXPORT_MODULE()

- (RCTPlatformView *)view
{
  return [ProgressIndicatorView new];
}

RCT_EXPORT_VIEW_PROPERTY(color, UIColor)
RCT_EXPORT_VIEW_PROPERTY(indeterminate, BOOL)
RCT_EXPORT_VIEW_PROPERTY(progress, double)
RCT_CUSTOM_VIEW_PROPERTY(size, UIActivityIndicatorViewStyle, ProgressIndicatorView)
{
  /*
    Setting activityIndicatorViewStyle overrides the color, so restore the original color
    after setting the indicator style.
  */
  RCTUIColor *oldColor = view.color;
  view.activityIndicatorViewStyle =
      json ? [RCTConvert UIActivityIndicatorViewStyle:json] : defaultView.activityIndicatorViewStyle;
  view.color = oldColor;
}

@end
