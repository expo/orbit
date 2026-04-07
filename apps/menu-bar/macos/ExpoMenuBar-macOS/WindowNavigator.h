@class RCTCallableJSModules;

@interface WindowNavigator : NSObject <NSWindowDelegate>

@property(nonatomic, strong) NSMutableDictionary<NSString *, NSWindow *> *windowsMap;
@property(nonatomic, weak) RCTCallableJSModules *callableJSModules;

+ (instancetype)shared;

- (void)openWindow:(NSString *)moduleName options:(NSDictionary *)options;

- (void)closeWindow:(NSString *)moduleName;

@end
