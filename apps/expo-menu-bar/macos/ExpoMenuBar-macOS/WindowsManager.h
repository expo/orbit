#import <React/RCTBridgeModule.h>

@interface WindowsManager : NSObject <RCTBridgeModule>
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSWindow *> *windowsMap;
@end
