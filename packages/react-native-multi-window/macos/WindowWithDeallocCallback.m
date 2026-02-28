#import "WindowWithDeallocCallback.h"

@implementation WindowWithDeallocCallback

- (void)dealloc {
  if (self.deallocCallback) {
    self.deallocCallback();
  }
}

@end
