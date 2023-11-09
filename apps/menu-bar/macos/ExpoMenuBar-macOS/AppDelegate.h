#import <Cocoa/Cocoa.h>

#import "Expo_Orbit-Swift.h"

@class RCTBridge;

@interface AppDelegate : NSObject <NSApplicationDelegate, NSUserNotificationCenterDelegate>
{
  NSStatusItem *statusItem;
  NSPopover *popover;
  SwifterWrapper *httpServer;
}

@property(nonatomic, readonly) RCTBridge *bridge;
@property(nonatomic, strong, readonly) NSPopover *popover;
- (void)openPopover;
- (void)closePopover;

@end
