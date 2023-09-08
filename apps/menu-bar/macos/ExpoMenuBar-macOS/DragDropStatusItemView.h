#import <Cocoa/Cocoa.h>

@interface DragDropStatusItemView : NSView <NSDraggingSource, NSDraggingDestination>

@property (nonatomic, copy) void (^openPopoverAction)(void);
- (instancetype)initWithFrame:(NSRect)frame;

@end
