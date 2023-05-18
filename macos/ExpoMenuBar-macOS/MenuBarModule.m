#import "MenuBarModule.h"

#import <React/RCTLog.h>

@implementation MenuBarModule

RCT_EXPORT_MODULE();

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

  NSData *data = [file readDataToEndOfFile];
  NSString *output = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];

  resolve(output);
}

@end
