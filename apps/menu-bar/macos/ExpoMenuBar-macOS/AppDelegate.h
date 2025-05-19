#import <Cocoa/Cocoa.h>
#import <RCTAppDelegate.h>

#import "Expo_Orbit-Swift.h"

@interface AppDelegate : RCTAppDelegate <NSUserNotificationCenterDelegate>
{
  SwifterWrapper *httpServer;
  PopoverManager *popoverManager;
}

#if RCT_DEV
@property (nonatomic, strong) NSWindowController *devWindowController;
#endif
- (IBAction)showHelp:(id)sender;

@end
