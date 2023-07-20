
@interface WindowNavigator : NSObject

@property(nonatomic, strong) NSMutableDictionary<NSString *, NSWindow *> *windowsMap;

+ (instancetype)shared;

- (void)openWindow:(NSString *)moduleName options:(NSDictionary *)options;

- (void)closeWindow:(NSString *)moduleName;

@end
