#import "MenuBarModule.h"

#import <React/RCTLog.h>

@implementation MenuBarModule
{
  bool hasListeners;
}

RCT_EXPORT_MODULE();


// Will be called when this module's first listener is added.
-(void)startObserving {
    hasListeners = YES;
    // Set up any upstream listeners or background tasks as necessary
}

// Will be called when this module's last listener is removed, or on dealloc.
-(void)stopObserving {
    hasListeners = NO;
    // Remove upstream listeners, stop unnecessary background tasks
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"onNewCommandLine"];
}

RCT_EXPORT_METHOD(exitApp)
{
  exit(0);
}

RCT_EXPORT_METHOD(runCommand:(NSString *)command
                  arguments:(NSArray *)arguments
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSTask *task = [[NSTask alloc] init];
  NSPipe *pipe = [NSPipe pipe];

  [task setLaunchPath:@"/bin/sh"];
  [task setArguments:@[@"-l", @"-c", [NSString stringWithFormat:@"PATH=\"$PATH:/usr/local/bin\"; %@ %@ ", command, [arguments componentsJoinedByString:@" "]]]];

  [task setStandardOutput:pipe];
  [task setStandardError:pipe];

  NSFileHandle *file = [pipe fileHandleForReading];
  [task launch];
 
  NSNotificationCenter *notificationCenter = [NSNotificationCenter defaultCenter];
  [notificationCenter addObserverForName:NSFileHandleReadCompletionNotification
                                  object:file
                                    queue:nil
                              usingBlock:^(NSNotification *notification) {
                                  NSData *chunk = notification.userInfo[NSFileHandleNotificationDataItem];
                                  NSString *output = [[NSString alloc] initWithData:chunk encoding:NSUTF8StringEncoding];
                                  if(self->hasListeners){
                                    [self sendEventWithName:@"onNewCommandLine" body:output];
                                  }
                                  [file readInBackgroundAndNotify];
                              }];
  [notificationCenter addObserverForName:NSTaskDidTerminateNotification
                                  object:task
                                    queue:nil
                              usingBlock:^(NSNotification *notification) {
                                  [notificationCenter removeObserver:self];
                              }];

  [file readInBackgroundAndNotify];
  [task waitUntilExit];

  resolve(nil);
}

@end
