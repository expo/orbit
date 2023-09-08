// DragDropStatusItemView.m
#import <Cocoa/Cocoa.h>

#import "DragDropStatusItemView.h"
#import "FileHandler.h"

@implementation DragDropStatusItemView

- (instancetype)initWithFrame:(NSRect)frameRect {
  self = [super initWithFrame:frameRect];
  if (self) {
    [self registerForDraggedTypes:@[NSPasteboardTypeFileURL]];

    NSImage *image = [NSImage imageNamed:@"menu-bar-icon"];
    [image setTemplate:YES];

    NSImageView *imageView = [[NSImageView alloc] initWithFrame:self.bounds];
    [imageView setImage:image];
    [imageView setImageAlignment:NSImageAlignCenter];
    [imageView setImageScaling:NSImageScaleProportionallyDown];
    [imageView unregisterDraggedTypes];
    [self addSubview:imageView];
  }
  return self;
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
    [[FileHandler shared] notifyFileOpened:filePath];
  }

  return YES;
}

@end
