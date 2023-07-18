#import <React/RCTUIKit.h>
#import <React/RCTComponent.h>

@interface Checkbox : NSButton

@property(nonatomic, assign) NSControlStateValue wasOn;
@property(nonatomic, copy) RCTBubblingEventBlock onChange;

@end
