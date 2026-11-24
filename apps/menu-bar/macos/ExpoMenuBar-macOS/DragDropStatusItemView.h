#import <Cocoa/Cocoa.h>

NS_ASSUME_NONNULL_BEGIN

@interface DragDropStatusItemView : NSView <NSDraggingSource, NSDraggingDestination>

@property (nonatomic, copy, nullable) void (^openPopoverAction)(void);
/// The text of a green badge at the lower right of the icon. With no text, there is no badge.
@property (nonatomic, copy, nullable) NSString *badgeText;
- (instancetype)initWithFrame:(NSRect)frame;

@end

NS_ASSUME_NONNULL_END
