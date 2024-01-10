import ExpoModulesCore
import UniformTypeIdentifiers

public class FilePickerModule: Module {
    public func definition() -> ModuleDefinition {
        Name("FilePicker")

        AsyncFunction("pickFileWithFilenameExtension"){  (filenameExtensions: [String], prompt: String) in
              NSApp.activate(ignoringOtherApps: true)
              let panel = NSOpenPanel()

              if !prompt.isEmpty {
                  panel.prompt = prompt
              }

              panel.allowsMultipleSelection = false
              panel.canChooseDirectories = true
              panel.canCreateDirectories = true

              if #available(macOS 11.0, *) {
                  var allowedTypes = [UTType]()

                  for extensionString in filenameExtensions {
                      let utTypesFromTag = UTType.types(tag: extensionString, tagClass: .filenameExtension, conformingTo: nil)
                      if !utTypesFromTag.isEmpty {
                          allowedTypes += utTypesFromTag
                      }


                      if let utTypeFromFilenameExtension = UTType(filenameExtension: extensionString), !allowedTypes.contains(utTypeFromFilenameExtension) {
                          allowedTypes.append(utTypeFromFilenameExtension)
                      }
                  } 

                  panel.allowedContentTypes = allowedTypes
              }

              guard panel.runModal() == NSApplication.ModalResponse.OK else {
                   throw Exception(name: "FILE_PICKER_ERROR", description: "NSModalResponseCancel")
              } 
              return panel.url?.path
        }.runOnQueue(.main)

        AsyncFunction("pickFolder"){  (promise: Promise) in
            DispatchQueue.main.async {
                let panel = NSOpenPanel()
                panel.allowsMultipleSelection = false
                panel.canChooseFiles = false
                panel.canChooseDirectories = true
                panel.canCreateDirectories = true

                if panel.runModal() == NSApplication.ModalResponse.OK {
                    promise.resolve(panel.url?.path)
                } else {
                    promise.reject(Exception(name: "FILE_PICKER_ERROR", description: "NSModalResponseCancel"))
                }
            }
        }
    }
}
