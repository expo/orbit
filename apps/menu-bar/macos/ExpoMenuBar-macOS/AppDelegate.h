#import <Cocoa/Cocoa.h>
#import <RCTAppDelegate.h>

#import "Expo_Orbit-Swift.h"

@class RCTBridge;

@interface AppDelegate : RCTAppDelegate <NSUserNotificationCenterDelegate>
{
  NSStatusItem *statusItem;
  NSPopover *popover;
  SwifterWrapper *httpServer;
}

@property(nonatomic, strong, readonly) NSPopover *popover;
#if RCT_DEV
@property (nonatomic, strong) NSWindowController *devWindowController;
#endif
- (void)openPopover;
- (void)closePopover;
- (void)setPopoverContentSize:(NSSize)size;
- (IBAction)showHelp:(id)sender;

@end
