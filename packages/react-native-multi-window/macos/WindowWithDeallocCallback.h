#import <Cocoa/Cocoa.h>

typedef void (^RNMultiWindowDeallocCallback)(void);

@interface WindowWithDeallocCallback : NSWindow

@property (nonatomic, copy) RNMultiWindowDeallocCallback deallocCallback;

@end
