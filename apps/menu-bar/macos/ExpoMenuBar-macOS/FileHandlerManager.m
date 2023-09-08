#import <Cocoa/Cocoa.h>
#import <React/RCTRootView.h>

#import "FileHandlerManager.h"
#import "FileHandler.h"

@implementation FileHandlerManager

RCT_EXPORT_MODULE();

- (instancetype)init {
  self = [super init];
  if (self) {
    self.handler = [FileHandler shared];
    
    __weak typeof(self) weakSelf = self;
    self.handler.sendOnOpenFileEvent = ^(NSString *filename) {
      [weakSelf sendOnOpenFileEvent:filename];
    };
  }
  return self;
}

- (void)sendOnOpenFileEvent:(NSString*) filename {
  if (_hasListeners) {
    [self sendEventWithName:@"onOpenFile" body:filename];
  }
}

- (void)startObserving {
  _hasListeners = YES;
}

- (void)stopObserving {
  _hasListeners = NO;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"onOpenFile"];
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
