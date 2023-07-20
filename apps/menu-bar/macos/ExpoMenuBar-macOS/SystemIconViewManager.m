// SystemIconViewManager.m
#import "SystemIconViewManager.h"

#import "RCTImageView+Private.h"

@interface SystemIconView : RCTImageView
 

@end

@implementation SystemIconView
 

- (void)setSystemIconName:(NSString *)systemIconName
{ 
  NSImage *systemIcon = [NSImage imageWithSystemSymbolName:systemIconName accessibilityDescription:nil];
  
  [super updateWithImage:systemIcon];
}
 

@end

@implementation SystemIconViewManager

RCT_EXPORT_MODULE()

RCT_EXPORT_VIEW_PROPERTY(systemIconName, NSString)

- (NSView *)view
{
  return [[SystemIconView alloc] initWithBridge:self.bridge];}

@end
