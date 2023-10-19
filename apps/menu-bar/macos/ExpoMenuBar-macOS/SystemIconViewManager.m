// SystemIconViewManager.m
#import "SystemIconViewManager.h"
 

@implementation SystemIconViewManager

RCT_EXPORT_MODULE()

RCT_CUSTOM_VIEW_PROPERTY(tintColor, NSColor, NSImageView)
{
  view.contentTintColor = [RCTConvert NSColor:json];
}

RCT_CUSTOM_VIEW_PROPERTY(systemIconName, NSString, NSImageView)
{
    NSString *symbolName = [RCTConvert NSString:json];
    NSImage *systemImage = [NSImage imageWithSystemSymbolName:symbolName accessibilityDescription:nil];
    [systemImage setTemplate:YES];

    if (systemImage) {
        view.image = systemImage;
    } else {
        NSLog(@"System symbol '%@' not found.", symbolName);
    }
}


- (NSView *)view
{
    NSImageView *imageView = [[NSImageView alloc] init];
    [imageView setImageScaling:NSImageScaleProportionallyUpOrDown];
    return imageView;
}


@end
