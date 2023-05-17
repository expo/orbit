#import "MenuBarModule.h"

#import <React/RCTLog.h>

@implementation MenuBarModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(exitApp)
{
  exit(0);
}

@end
