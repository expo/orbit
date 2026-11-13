// DragDropStatusItemView.m
#import <Cocoa/Cocoa.h>

#import "DragDropStatusItemView.h"

static const CGFloat kBadgeHeight = 10;
// The clear ring between the badge and the icon.
static const CGFloat kBadgeGap = 1.2;
// The space at each side of a text that is wider than one digit.
static const CGFloat kBadgeTextInset = 2.5;

// A green badge with a short text, for example the number of running remote sessions. It is a
// circle for one digit and a pill for a wider text.
@interface StatusItemBadgeView : NSView
@property (nonatomic, copy) NSString *text;
+ (CGFloat)widthForText:(NSString *)text;
@end

@implementation StatusItemBadgeView

+ (NSFont *)font {
  return [NSFont systemFontOfSize:7.75 weight:NSFontWeightBold];
}

+ (CGFloat)widthForText:(NSString *)text {
  CGFloat textWidth = [text sizeWithAttributes:@{NSFontAttributeName: [self font]}].width;
  // A whole number of pixels on a 2x display.
  return MAX(kBadgeHeight, ceil((textWidth + 2 * kBadgeTextInset) * 2) / 2);
}

- (void)drawRect:(NSRect)dirtyRect {
  // The appearance is that of the menu bar, which can be dark while the system is light.
  BOOL isDark = [[self.effectiveAppearance bestMatchFromAppearancesWithNames:@[
    NSAppearanceNameAqua, NSAppearanceNameDarkAqua
  ]] isEqualToString:NSAppearanceNameDarkAqua];
  NSColor *fill = isDark ? [NSColor colorWithSRGBRed:0.19 green:0.82 blue:0.35 alpha:1]
                         : [NSColor colorWithSRGBRed:0.16 green:0.65 blue:0.27 alpha:1];
  // White text has too little contrast on the green of a dark menu bar.
  NSColor *ink = isDark ? [NSColor colorWithSRGBRed:0.02 green:0.17 blue:0.07 alpha:1]
                        : NSColor.whiteColor;

  CGFloat radius = NSHeight(self.bounds) / 2;
  [fill setFill];
  [[NSBezierPath bezierPathWithRoundedRect:self.bounds xRadius:radius yRadius:radius] fill];

  NSFont *font = [StatusItemBadgeView font];
  NSDictionary *attributes = @{NSFontAttributeName: font, NSForegroundColorAttributeName: ink};
  NSSize size = [self.text sizeWithAttributes:attributes];
  // Center the capital height, not the line box: digits have no descender.
  CGFloat baseline = (NSHeight(self.bounds) - font.capHeight) / 2;
  [self.text drawAtPoint:NSMakePoint((NSWidth(self.bounds) - size.width) / 2, baseline + font.descender)
          withAttributes:attributes];
}

- (void)viewDidChangeEffectiveAppearance {
  [super viewDidChangeEffectiveAppearance];
  self.needsDisplay = YES;
}

// Clicks and drags go to the status item, as with no badge.
- (NSView *)hitTest:(NSPoint)point {
  return nil;
}

@end

@implementation DragDropStatusItemView {
  NSImage *_icon;
  NSImageView *_imageView;
  StatusItemBadgeView *_badgeView;
}

- (instancetype)initWithFrame:(NSRect)frameRect {
  self = [super initWithFrame:frameRect];
  if (self) {
    [self registerForDraggedTypes:@[NSPasteboardTypeFileURL]];

    #if DEBUG
        NSImage *image = [NSImage imageNamed:@"menu-bar-icon-debug"];
    #else
        NSImage *image = [NSImage imageNamed:@"menu-bar-icon"];
    #endif
    [image setTemplate:YES];
    _icon = image;

    NSImageView *imageView = [[NSImageView alloc] initWithFrame:self.bounds];
    [imageView setImage:image];
    [imageView setImageAlignment:NSImageAlignCenter];
    [imageView setImageScaling:NSImageScaleProportionallyDown];
    [imageView unregisterDraggedTypes];
    [self addSubview:imageView];
    _imageView = imageView;
  }
  return self;
}

- (void)setBadgeText:(NSString *)badgeText {
  _badgeText = badgeText.length ? [badgeText copy] : nil;

  if (!_badgeText) {
    _imageView.image = _icon;
    _badgeView.hidden = YES;
    return;
  }

  // The lower right corner of the view.
  CGFloat badgeWidth = [StatusItemBadgeView widthForText:_badgeText];
  NSRect badgeFrame = NSMakeRect(NSWidth(self.bounds) - badgeWidth, 0, badgeWidth, kBadgeHeight);
  if (!_badgeView) {
    _badgeView = [[StatusItemBadgeView alloc] initWithFrame:badgeFrame];
    [self addSubview:_badgeView];
  }
  _badgeView.frame = badgeFrame;
  _badgeView.text = _badgeText;
  _badgeView.hidden = NO;
  _badgeView.needsDisplay = YES;

  // The icon stays a template image, so it keeps the color of the menu bar. A hole in it
  // leaves a clear ring around the badge. The image view centers the icon.
  NSImage *icon = _icon;
  NSSize iconSize = icon.size;
  NSRect hole = NSInsetRect(
    NSOffsetRect(badgeFrame,
                 -(NSWidth(self.bounds) - iconSize.width) / 2,
                 -(NSHeight(self.bounds) - iconSize.height) / 2),
    -kBadgeGap, -kBadgeGap);
  CGFloat holeRadius = NSHeight(hole) / 2;
  NSImage *iconWithHole = [NSImage imageWithSize:iconSize flipped:NO drawingHandler:^BOOL(NSRect rect) {
    [icon drawInRect:rect];
    NSGraphicsContext.currentContext.compositingOperation = NSCompositingOperationDestinationOut;
    [NSColor.blackColor setFill];
    [[NSBezierPath bezierPathWithRoundedRect:hole xRadius:holeRadius yRadius:holeRadius] fill];
    return YES;
  }];
  iconWithHole.template = YES;
  _imageView.image = iconWithHole;
}


- (NSDragOperation)draggingEntered:(id<NSDraggingInfo>)sender {
  NSPasteboard *pasteboard = [sender draggingPasteboard];
  NSArray<NSURL*> *files = [pasteboard readObjectsForClasses:@[[NSURL class]] options:@{}];
  NSArray<NSString *> *allowedExtensions = @[@"apk", @"ipa", @"app", @"gz"];

  for (NSURL *url in files)
  {
    NSString *fileExtension = [url pathExtension];
    if (![allowedExtensions containsObject:[fileExtension lowercaseString]]) {
      return NSDragOperationNone;
    }
  }

  return NSDragOperationCopy;
}

- (BOOL)performDragOperation:(id<NSDraggingInfo>)sender {
  if (self.openPopoverAction) {
    self.openPopoverAction();
  }

  NSPasteboard *pasteboard = [sender draggingPasteboard];
  NSArray<NSURL*> *files = [pasteboard readObjectsForClasses:@[[NSURL class]] options:@{}];

  for (NSURL *url in files) {
    NSString *filePath = [url path];
    [NSNotificationCenter.defaultCenter postNotificationName:@"ExpoOrbit_OnOpenFile" object:filePath];
  }

  return YES;
}

@end
