#import <Foundation/Foundation.h>

@interface FileHandler : NSObject

@property (class, nonatomic, readonly) FileHandler * _Nullable shared;
@property (nonatomic, copy, nullable) void (^sendOnOpenFileEvent)(NSString * _Nullable filename);

- (void)notifyFileOpened:(NSString *_Nonnull)filename;

@end

