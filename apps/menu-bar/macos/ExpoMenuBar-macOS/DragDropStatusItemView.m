// DragDropStatusItemView.m
#import <Cocoa/Cocoa.h>

#import "DragDropStatusItemView.h"

static const CGFloat kBadgeDiameter = 10;
// The clear ring between the badge and the icon.
static const CGFloat kBadgeGap = 1.2;

// A green circle with a short text, for example the number of running remote sessions.
@interface StatusItemBadgeView : NSView
@property (nonatomic, copy) NSString *text;
@end

@implementation StatusItemBadgeView

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

  [fill setFill];
  [[NSBezierPath bezierPathWithOvalInRect:self.bounds] fill];

  // Two characters, as in "9+", need a smaller size to fit.
  NSFont *font = [NSFont systemFontOfSize:self.text.length > 1 ? 6 : 7.75 weight:NSFontWeightBold];
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
  NSRect badgeFrame = NSMakeRect(NSWidth(self.bounds) - kBadgeDiameter, 0, kBadgeDiameter, kBadgeDiameter);
  if (!_badgeView) {
    _badgeView = [[StatusItemBadgeView alloc] initWithFrame:badgeFrame];
    [self addSubview:_badgeView];
  }
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
  NSImage *iconWithHole = [NSImage imageWithSize:iconSize flipped:NO drawingHandler:^BOOL(NSRect rect) {
    [icon drawInRect:rect];
    NSGraphicsContext.currentContext.compositingOperation = NSCompositingOperationDestinationOut;
    [NSColor.blackColor setFill];
    [[NSBezierPath bezierPathWithOvalInRect:hole] fill];
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
