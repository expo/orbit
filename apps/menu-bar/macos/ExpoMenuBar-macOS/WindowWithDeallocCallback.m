#import "WindowWithDeallocCallback.h"

@implementation WindowWithDeallocCallback

- (void)dealloc {
  // Invoke the callback block if it exists
      if (self.deallocCallback) {
          self.deallocCallback();
      }
}

@end
