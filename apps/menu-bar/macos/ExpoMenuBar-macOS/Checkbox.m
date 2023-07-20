#import <React/RCTUIKit.h>
#import "Checkbox.h"
 

@implementation Checkbox

- (void)setState:(NSControlStateValue)state
{
  _wasOn = state;
  [super setState:state];
}

@end
