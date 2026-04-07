#import "RCTHostWrapper.h"
#import <ReactCommon/RCTHost.h>

@implementation RCTHostWrapper {
  RCTHost *_host;
}

- (instancetype)initWithHost:(id)host {
  self = [super init];
  if (self) {
    _host = host;
  }
  return self;
}

- (void)callFunctionOnJSModule:(NSString *)moduleName method:(NSString *)method args:(NSArray *)args {
  [_host callFunctionOnJSModule:moduleName method:method args:args];
}

@end
