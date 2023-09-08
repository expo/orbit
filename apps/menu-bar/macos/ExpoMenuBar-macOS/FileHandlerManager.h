#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#import "FileHandler.h"

@interface FileHandlerManager : RCTEventEmitter <RCTBridgeModule>
  @property (nonatomic) BOOL hasListeners;
  @property (nonatomic, strong) FileHandler *handler;
@end

