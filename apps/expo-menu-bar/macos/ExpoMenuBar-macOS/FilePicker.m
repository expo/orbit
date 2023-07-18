#import "FilePicker.h"
#import <Cocoa/Cocoa.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

@implementation FilePicker

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(pickFileWithFilenameExtension:(NSArray<NSString *> *)filenameExtensions
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    [panel setAllowsMultipleSelection:NO];
    [panel setCanChooseDirectories:YES];
    [panel setCanCreateDirectories:YES];

    if (@available(macOS 11.0, *)) {
      NSMutableArray<UTType *> *allowedTypes = [NSMutableArray array];
      for (NSString *extension in filenameExtensions) {
        UTType *utType = [UTType typeWithFilenameExtension:extension];
        if (utType) {
          [allowedTypes addObject:utType];
        }
      }
      [panel setAllowedContentTypes:allowedTypes];
    }

    // Get the main window from the application
    NSWindow *mainWindow = [NSApplication sharedApplication].mainWindow;
    if (mainWindow) {
      [panel beginSheetModalForWindow:mainWindow completionHandler:^(NSModalResponse result) {
        if (result == NSModalResponseOK) {
          resolve(panel.URL.path);
        } else {
          reject(@"FILE_PICKER_ERROR", @"NSModalResponseCancel", nil);
        }
      }];
    } else {
      // Fallback to runModal if the main window is not available
      if ([panel runModal] == NSModalResponseOK){
        resolve(panel.URL.path);
      } else {
        reject(@"FILE_PICKER_ERROR", @"NSModalResponseCancel", nil);
      }
    }
  });
}


RCT_EXPORT_METHOD(pickFolder:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    [panel setAllowsMultipleSelection:NO];
    [panel setCanChooseFiles:NO];
    [panel setCanChooseDirectories:YES];
    [panel setCanCreateDirectories:YES];

    if ([panel runModal] == NSModalResponseOK){
          resolve(panel.URL.path);
    }else {
      reject(@"FILE_PICKER_ERROR", @"NSModalResponseCancel", nil);
    }
  });
}

@end
