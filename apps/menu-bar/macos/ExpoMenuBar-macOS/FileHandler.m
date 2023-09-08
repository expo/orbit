#import <Cocoa/Cocoa.h>
#import <React/RCTRootView.h>

#import "FileHandler.h"

@implementation FileHandler

+ (instancetype)shared {
    static FileHandler *sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [[self alloc] init];
    });
    return sharedInstance;
}

- (void)notifyFileOpened:(NSString *)filename {
    if (self.sendOnOpenFileEvent) {
        self.sendOnOpenFileEvent(filename);
    }
}

@end
