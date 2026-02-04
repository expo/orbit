#import <Cocoa/Cocoa.h>
#import <React/RCTBridge.h>

#import "RCTRootViewFactory.h"

@interface RNMultiWindowNavigator : NSObject <NSWindowDelegate>

@property (nonatomic, strong) NSMutableDictionary<NSString *, NSWindow *> *windowsMap;

+ (instancetype)shared;

+ (void)setRootViewFactory:(RCTRootViewFactory *)factory;
+ (void)setBridge:(RCTBridge *)bridge;

- (void)openWindow:(NSString *)moduleName options:(NSDictionary *)options;
- (void)closeWindow:(NSString *)moduleName;

@end
