#import <React/RCTUIManager.h>

#import "CheckboxManager.h"
#import "Checkbox.h"

@implementation CheckboxManager

RCT_EXPORT_MODULE()

- (RCTPlatformView *)view
{
  Checkbox *checkbox = [Checkbox new];
  [checkbox setButtonType:NSButtonTypeSwitch];
  [checkbox setTarget:self];
  [checkbox setAction:@selector(onChange:)];
  [checkbox setTitle:@""];

  return checkbox;
}

- (void)onChange:(Checkbox *)sender
{
  if (sender.wasOn != sender.state) {
    if (sender.onChange) {
      sender.onChange(@{@"value" : sender.state ? @YES : @NO});
    }
    sender.wasOn = sender.state;
  }
}

RCT_EXPORT_METHOD(setValue : (nonnull NSNumber *)viewTag toValue : (BOOL)value)
{
  [self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTUIView *> *viewRegistry) {
    RCTUIView *view = viewRegistry[viewTag];
    NSControlStateValue newValue = value ? NSControlStateValueOn : NSControlStateValueOff;
    if ([view isKindOfClass:[Checkbox class]]) {
      [(Checkbox *)view setState:newValue];
    } else {
      RCTLogError(@"view type must be NSButton");
    }
  }];
}


RCT_REMAP_VIEW_PROPERTY(value, state, BOOL);
RCT_EXPORT_VIEW_PROPERTY(onChange, RCTBubblingEventBlock);
RCT_CUSTOM_VIEW_PROPERTY(disabled, BOOL, Checkbox)
{
  if (json) {
    view.enabled = !([RCTConvert BOOL:json]);
  } else {
    view.enabled = defaultView.enabled;
  }
}

@end
