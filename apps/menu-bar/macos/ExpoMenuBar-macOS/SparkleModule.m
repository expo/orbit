#import "SparkleModule.h"
#import "AppDelegate.h"

#import <Sparkle/SPUStandardUpdaterController.h>
#import <Sparkle/SPUUpdater.h>

@implementation SparkleModule {
  SPUStandardUpdaterController *updateController;
}

RCT_EXPORT_MODULE();

- (instancetype)init {
  self = [super init];
  if (self) {
    updateController = [[SPUStandardUpdaterController alloc] initWithStartingUpdater:YES updaterDelegate:nil userDriverDelegate:nil];
  }
  return self;
}


+ (BOOL)requiresMainQueueSetup
{
  return YES;
}


RCT_EXPORT_METHOD(checkForUpdates)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [[self->updateController updater] checkForUpdates];
  });
}

RCT_EXPORT_METHOD(getAutomaticallyChecksForUpdates:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@([[self->updateController updater] automaticallyChecksForUpdates]));
}

RCT_EXPORT_METHOD(setAutomaticallyChecksForUpdates:(BOOL)value)
{
  [[self->updateController updater] setAutomaticallyChecksForUpdates:value];
}

@end
