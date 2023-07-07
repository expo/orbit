#import "MenuBarModule.h"
#import "AppDelegate.h"

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
  return @[@"onNewCommandLine", @"onCLIOutput"];
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSDictionary *)constantsToExport
{
  return @{
    @"appVersion"      : [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"] ?: [NSNull null],
    @"buildVersion"    : [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleVersion"] ?: [NSNull null],
  };
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

RCT_EXPORT_METHOD(runCli:(NSString *)command
                  arguments:(NSArray *)arguments
                  listenerId:(nonnull NSNumber *)listenerId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSTask *task = [[NSTask alloc] init];
  NSPipe *pipe = [NSPipe pipe];

  NSString *executablePath = [[NSBundle mainBundle] pathForResource:@"expo-menu-cli" ofType:nil];

  [task setLaunchPath:executablePath];
  [task setArguments:[@[command] arrayByAddingObjectsFromArray:arguments]];


  [task setStandardOutput:pipe];
  [task setStandardError:pipe];

  NSFileHandle *file = [pipe fileHandleForReading];
  __block NSString *returnOutput = @"";
  __block BOOL hasReachedReturnOutput = false;
  __block BOOL hasReachedError = false;

  [task launch];

  NSNotificationCenter *notificationCenter = [NSNotificationCenter defaultCenter];
  [notificationCenter addObserverForName:NSFileHandleReadCompletionNotification
                                  object:file
                                    queue:nil
                              usingBlock:^(NSNotification *notification) {
                                  NSData *chunk = notification.userInfo[NSFileHandleNotificationDataItem];
                                  NSString *wholeOutput = [[NSString alloc] initWithData:chunk encoding:NSUTF8StringEncoding];
                                  NSArray *outputs = [wholeOutput componentsSeparatedByCharactersInSet:[NSCharacterSet newlineCharacterSet]];

                                  for (NSString *output in outputs) {
                                    if ([output isEqualToString:@""]) {
                                      continue;
                                    }

                                    if(hasReachedReturnOutput || hasReachedError){
                                      returnOutput = [returnOutput stringByAppendingString:output];
                                    } else if([output isEqualToString:@"---- return output ----"]){
                                      hasReachedReturnOutput = true;
                                    } else if([output isEqualToString:@"---- thrown error ----"]){
                                      hasReachedError = true;
                                    } else if(self->hasListeners && output.length > 0 && ![output isEqualToString:@"\n"]){
                                      NSDictionary *eventData = @{
                                        @"listenerId": listenerId,
                                        @"output": output
                                      };
                                      [self sendEventWithName:@"onCLIOutput" body:eventData];
                                    }
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

  if(hasReachedError){
    reject(@"CLI_ERROR", returnOutput, nil);
    return;
  }

  resolve(hasReachedReturnOutput ? returnOutput : nil);
}

RCT_EXPORT_METHOD(setPopoverSize:(double) width
                  height:(double) height
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    AppDelegate *appDelegate = (AppDelegate *)[[UIApplication sharedApplication] delegate];
    [[appDelegate popover] setContentSize:CGSizeMake(width, height)];
    resolve(nil);
  });
}

@end
