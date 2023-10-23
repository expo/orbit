#import "WebAuthenticationSession.h"
#import <React/RCTLog.h>
#import <AuthenticationServices/AuthenticationServices.h>


@interface WebAuthenticationSession () <ASWebAuthenticationPresentationContextProviding>

@property (nonatomic, strong) ASWebAuthenticationSession *authSession;

@end

@implementation WebAuthenticationSession

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(openAuthSessionAsync:(NSString *)urlString
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *url = [NSURL URLWithString:urlString];

  self.authSession = [[ASWebAuthenticationSession alloc]
                      initWithURL:url
                      callbackURLScheme:@"expo-orbit"
                      completionHandler:^(NSURL * _Nullable callbackURL, NSError * _Nullable error) {
    if (error) {
      reject(@"AUTH_SESSION_ERROR", [error localizedDescription], error);
    } else {
      if(callbackURL){
        resolve(@{@"type": @"success", @"url": callbackURL.absoluteString});
      } else {
        resolve(@{@"type": @"cancel"});
      }
    }
  }];
  [self.authSession setPrefersEphemeralWebBrowserSession:true];

  if (@available(macOS 10.15, *)) {
    self.authSession.presentationContextProvider = self;
    [self.authSession start];
  }
}

#pragma mark - ASWebAuthenticationPresentationContextProviding

- (ASPresentationAnchor)presentationAnchorForWebAuthenticationSession:(ASWebAuthenticationSession *)session API_AVAILABLE(macos(10.15)) {
  __block ASPresentationAnchor anchor = nil;
  dispatch_sync(dispatch_get_main_queue(), ^{
    anchor = [NSApp mainWindow];
  });
  return anchor;
}

@end
