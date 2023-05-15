#import <Cocoa/Cocoa.h>

@class RCTBridge;

@interface AppDelegate : NSObject <NSApplicationDelegate> {
  NSStatusItem *statusItem;
}

@property (nonatomic, readonly) RCTBridge *bridge; 

@end
