#import <Foundation/Foundation.h> 

@interface RCTHostWrapper : NSObject

- (instancetype)initWithHost:(id)host;
- (void)callFunctionOnJSModule:(NSString *)moduleName method:(NSString *)method args:(NSArray *)args;

@end
