#import "FilePicker.h"
#import <Cocoa/Cocoa.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

@implementation FilePicker

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(pickFileWithFilenameExtension:(NSArray<NSString *> *)filenameExtensions
                  prompt:(NSString *)prompt
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [NSApp activateIgnoringOtherApps:YES];
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    if(prompt){
      [panel setPrompt:prompt];
    }
    [panel setAllowsMultipleSelection:NO];
    [panel setCanChooseDirectories:YES];
    [panel setCanCreateDirectories:YES];

    if (@available(macOS 11.0, *)) {
      NSMutableArray<UTType *> *allowedTypes = [NSMutableArray array];

      for (NSString *extension in filenameExtensions) {
        NSArray *utTypes = [UTType typesWithTag:extension tagClass:UTTagClassFilenameExtension conformingToType:nil];
        [allowedTypes addObjectsFromArray:utTypes];

        UTType *utType = [UTType typeWithFilenameExtension:extension];
        if (utType && ![allowedTypes doesContain:utType]) {
          [allowedTypes addObject:utType];
        }
      }
      [panel setAllowedContentTypes:allowedTypes];
    }

    if ([panel runModal] == NSModalResponseOK){
      resolve(panel.URL.path);
    } else {
      reject(@"FILE_PICKER_ERROR", @"NSModalResponseCancel", nil);
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
