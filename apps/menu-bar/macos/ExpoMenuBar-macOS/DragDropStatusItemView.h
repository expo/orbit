#import <Cocoa/Cocoa.h>

@interface DragDropStatusItemView : NSView <NSDraggingSource, NSDraggingDestination>

@property (nonatomic, copy) void (^openPopoverAction)(void);
/// The text of a green badge at the lower right of the icon. With no text, there is no badge.
@property (nonatomic, copy) NSString *badgeText;
- (instancetype)initWithFrame:(NSRect)frame;

@end
