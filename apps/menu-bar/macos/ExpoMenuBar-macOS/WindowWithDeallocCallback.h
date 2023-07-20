#import <Cocoa/Cocoa.h>

typedef void (^DeallocCallback)(void);

@interface WindowWithDeallocCallback : NSWindow

@property (nonatomic, copy) DeallocCallback deallocCallback;

@end
