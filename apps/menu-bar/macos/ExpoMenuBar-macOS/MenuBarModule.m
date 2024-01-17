#import "MenuBarModule.h"
#import "AppDelegate.h"
#import <sys/utsname.h>

#import <React/RCTLog.h>
#import <ServiceManagement/ServiceManagement.h>

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
    @"appVersion"         : [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"] ?: [NSNull null],
    @"buildVersion"       : [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleVersion"] ?: [NSNull null],
    @"initialScreenSize"  : @{
      @"height":  @([[NSScreen mainScreen] frame].size.height),
      @"width":  @([[NSScreen mainScreen] frame].size.width)
    },
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
   __block NSString *returnOutput = @"";
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

                                    returnOutput = [returnOutput stringByAppendingString:output];

                                    if(self->hasListeners && output.length > 0 && ![output isEqualToString:@"\n"]){
                                      [self sendEventWithName:@"onNewCommandLine" body:output];
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

  resolve(returnOutput);
}

NSString *getMachineHardwareName(void) {
    struct utsname sysinfo;
    int retVal = uname(&sysinfo);
    if (EXIT_SUCCESS != retVal) return nil;

    return [NSString stringWithUTF8String:sysinfo.machine];
}

NSString *getCliResourceNameForArch(void) {
    NSString *arch = getMachineHardwareName();
    if([arch isEqualToString:@"arm64"]){
      return @"orbit-cli-arm64";
    }

    return @"orbit-cli-x64";
}

RCT_EXPORT_METHOD(runCli:(NSString *)command
                  arguments:(NSArray *)arguments
                  listenerId:(nonnull NSNumber *)listenerId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    NSTask *task = [[NSTask alloc] init];
    NSPipe *pipe = [NSPipe pipe];

    NSString *executablePath = [[NSBundle mainBundle] pathForResource:getCliResourceNameForArch() ofType:nil];

    [task setLaunchPath:executablePath];
    [task setArguments:[@[command] arrayByAddingObjectsFromArray:arguments]];

    NSMutableDictionary *environment = [NSMutableDictionary dictionaryWithDictionary:[[NSProcessInfo processInfo] environment]];
    [environment addEntriesFromDictionary:@{@"EXPO_MENU_BAR": @YES}];

    // Retrieve the envVars from NSUserDefaults
    NSUserDefaults *userDefaults = [NSUserDefaults standardUserDefaults];
    NSDictionary *envVars = [userDefaults objectForKey:@"envVars"];

    // Check if the retrieved object is indeed a NSDictionary
    if ([envVars isKindOfClass:[NSDictionary class]] && [envVars count] > 0) {
      [environment addEntriesFromDictionary:envVars];
    }

    [task setEnvironment:environment];
    [task setStandardOutput:pipe];
    [task setStandardError:pipe];

    NSFileHandle *file = [pipe fileHandleForReading];
    NSMutableString *returnOutput = [NSMutableString string];
    __block BOOL hasReachedReturnOutput = NO;
    __block BOOL hasReachedError = NO;

    [file setReadabilityHandler:^(NSFileHandle * _Nonnull handle) {
      NSData *availableData = [handle availableData];
      NSString *wholeOutput = [[NSString alloc] initWithData:availableData encoding:NSUTF8StringEncoding];
      NSArray *outputs = [wholeOutput componentsSeparatedByCharactersInSet:[NSCharacterSet newlineCharacterSet]];

      for (NSString *output in outputs) {
        if ([output isEqualToString:@""]) {
          continue;
        }

        if(hasReachedReturnOutput || hasReachedError){
          [returnOutput appendString:output];
        } else if([output isEqualToString:@"---- return output ----"]) {
          hasReachedReturnOutput = YES;
        } else if([output isEqualToString:@"---- thrown error ----"]) {
          hasReachedError = YES;
        } else if(self->hasListeners && output.length > 0 && ![output isEqualToString:@"\n"]) {
          NSDictionary *eventData = @{
            @"listenerId": listenerId,
            @"output": output
          };
          [self sendEventWithName:@"onCLIOutput" body:eventData];
        }
      }
    }];

    [task setTerminationHandler:^(NSTask * _Nonnull task) {
      [file setReadabilityHandler:nil];

      if(hasReachedError){
        reject(@"CLI_ERROR", returnOutput, nil);
      } else {
        resolve(hasReachedReturnOutput ? returnOutput : nil);
      }
    }];

    [task launch];
  });
}

RCT_EXPORT_METHOD(setLoginItemEnabled:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (SMLoginItemSetEnabled((__bridge CFStringRef)@"dev.expo.AutoLauncher", enabled)) {
    resolve(nil);
  } else {
    reject(@"AUTO_LAUNCHER_ERROR", @"Failed to update login item status.", nil);
  }
}

RCT_EXPORT_METHOD(showMultiOptionAlert:(NSString *)title
                  message:(NSString *)message
                  options:(NSArray<NSString *> *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject){
  dispatch_async(dispatch_get_main_queue(), ^{
    NSAlert *alert = [[NSAlert alloc] init];
    [alert setMessageText:title];
    [alert setInformativeText:message];
    [alert addButtonWithTitle:@"OK"];
    [alert addButtonWithTitle:@"Cancel"];

    NSPopUpButton *popUpButton = [[NSPopUpButton alloc] initWithFrame:NSMakeRect(0, 0, 250, 24) pullsDown:NO];
    [popUpButton addItemsWithTitles:options];

    [alert setAccessoryView:popUpButton];

    NSInteger response = [alert runModal];
    if (response == NSAlertFirstButtonReturn) {
      resolve(@([popUpButton indexOfSelectedItem]));
    } else {
      reject(@"MULTI_OPTION_ALERT", @"Selection was canceled.", nil);
    }
  });
}


RCT_EXPORT_METHOD(openSystemSettingsLoginItems)
{
  if (@available(macOS 13.0, *)) {
    [SMAppService openSystemSettingsLoginItems];
  } else {
    NSString *url = @"x-apple.systempreferences:com.apple.LoginItems-Settings.extension";
    [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:url]];
  }
}

RCT_EXPORT_METHOD(setEnvVars:(NSDictionary *)envVars)
{
  NSUserDefaults *userDefaults = [NSUserDefaults standardUserDefaults];
  [userDefaults setObject:envVars forKey:@"envVars"];
  [userDefaults synchronize];
}

RCT_EXPORT_METHOD(openPopover)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [((AppDelegate *)[NSApp delegate]) openPopover];
  });
}

RCT_EXPORT_METHOD(closePopover)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [((AppDelegate *)[NSApp delegate]) closePopover];
  });
}

@end
