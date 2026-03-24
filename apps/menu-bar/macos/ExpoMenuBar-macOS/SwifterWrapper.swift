import Foundation
import Swifter
import Dispatch

private let PORTS = [35783, 47909, 44171, 50799]
private let WHITELISTED_DOMAINS = ["expo.dev", "expo.test", "exp.host", "localhost"]

@objc class SwifterWrapper: NSObject {
  let server = HttpServer()

  override init() {
    super.init()

    server.middleware.append { request in
      guard let origin = request.headers["origin"] else {
        return .forbidden
      }

      if !WHITELISTED_DOMAINS.contains(self.extractRootDomain(from: origin)) {
        return .forbidden
      }

      return nil
    }

    server.GET["/orbit/status"] = { request in
      let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString")
      return self.okJsonResponseWithCorsHeaders(json: ["ok": true, "version": version], request: request)
    }

    server.GET["/orbit/devices"] = { request in
      let task = Process()
      let pipe = Pipe()

      task.executableURL = Bundle.main.url(forResource: self.getCliResourceNameForArch(), withExtension: nil)
      task.arguments = ["list-devices"]
      task.standardOutput = pipe
      task.standardError = FileHandle.nullDevice

      var environment = ProcessInfo.processInfo.environment
      environment["EXPO_MENU_BAR"] = "true"
      task.environment = environment

      do {
        try task.run()
      } catch {
        return self.okJsonResponseWithCorsHeaders(json: ["error": "Failed to run CLI: \(error.localizedDescription)"], request: request)
      }

      task.waitUntilExit()

      let data = pipe.fileHandleForReading.readDataToEndOfFile()
      let output = String(data: data, encoding: .utf8) ?? ""

      // The CLI outputs "---- return output ----" before the JSON payload
      let marker = "---- return output ----"
      let jsonString: String
      if let range = output.range(of: marker) {
        jsonString = String(output[range.upperBound...]).trimmingCharacters(in: .whitespacesAndNewlines)
      } else {
        jsonString = output.trimmingCharacters(in: .whitespacesAndNewlines)
      }

      guard let jsonData = jsonString.data(using: .utf8),
            let json = try? JSONSerialization.jsonObject(with: jsonData) else {
        return self.okJsonResponseWithCorsHeaders(json: ["error": "Failed to parse device list"], request: request)
      }

      return self.okJsonResponseWithCorsHeaders(json: json, request: request)
    }

    server.GET["/orbit/open"] = { request in
      guard let (_, urlParam) = request.queryParams.first(where: { $0.0 == "url" }),
            let decodedURLParam = urlParam.removingPercentEncoding else {
        return .badRequest(nil)
      }

      let deeplinkURLString = decodedURLParam.replacingOccurrences(of: "https://", with: "expo-orbit://")
                                             .replacingOccurrences(of: "exp://", with: "expo-orbit://")

      let appleEvent = NSAppleEventDescriptor(eventClass: AEEventClass(kInternetEventClass),
                                              eventID: AEEventID(kAEGetURL),
                                              targetDescriptor: NSAppleEventDescriptor.currentProcess(),
                                              returnID: AEReturnID(kAutoGenerateReturnID),
                                              transactionID: AETransactionID(kAnyTransactionID))
      appleEvent.setDescriptor(NSAppleEventDescriptor(string: deeplinkURLString), forKeyword: keyDirectObject)
      DispatchQueue.main.sync {
        do {
          try appleEvent.sendEvent(timeout: 3)
        } catch {
          print("An error occurred: \(error)")
        }
      }

      return self.okJsonResponseWithCorsHeaders(json: ["ok": true], request: request)
    }

    startServer()
  }

  private func startServer(attempts: Int = 0) {
    if PORTS.count - 1 < attempts {
      return
    }

    let port: UInt16 = UInt16(PORTS[attempts])
    do {
      try server.start(port)
      print("Local server running on port \(try server.port()).")
    } catch SocketError.bindFailed(let message) where message == "Address already in use" {
      startServer(attempts: attempts + 1)
    } catch {
      print("Server start error: \(error)")
    }
  }

  private func extractRootDomain(from urlString: String) -> String {
    guard let originUrl = URL(string: urlString.removingPercentEncoding ?? "") else {
      return ""
    }

    var hostName: String
    if let originalHostName = originUrl.host {
      hostName = originalHostName
    } else {
      // Orbit deeplink may include specific routes in the URL e.g. /update, /snack, /download, etc.
      let components = NSURLComponents(url: originUrl, resolvingAgainstBaseURL: true)
      let urlStringFromParams = components?.queryItems?.first(where: { $0.name == "url" })?.value

      if urlStringFromParams != nil {
        let urlFromParams = URL(string: urlStringFromParams ?? "")
        hostName = urlFromParams?.host ?? ""
      } else {
        hostName = ""
      }
    }

    if !hostName.contains(".") && originUrl.pathComponents.count > 1 {
      hostName = originUrl.pathComponents[1]
    }

    let components = hostName.components(separatedBy: ".")
    if components.count > 2 {
      return components.suffix(2).joined(separator: ".")
    } else {
      return hostName
    }
  }

  private func getCliResourceNameForArch() -> String {
    var sysinfo = utsname()
    uname(&sysinfo)
    let machine = withUnsafePointer(to: &sysinfo.machine) {
      $0.withMemoryRebound(to: CChar.self, capacity: 1) {
        String(validatingUTF8: $0) ?? "unknown"
      }
    }
    return machine == "arm64" ? "orbit-cli-arm64" : "orbit-cli-x64"
  }

  func okJsonResponseWithCorsHeaders(json: Any, request: HttpRequest) -> HttpResponse {
    var extraHeaders = ["Content-Type": "application/json"]
    if request.headers["origin"] != nil {
      extraHeaders["Access-Control-Allow-Origin"] = request.headers["origin"]
    }

    return .raw(200, "OK", extraHeaders, { writer in
      guard JSONSerialization.isValidJSONObject(json) else {
        throw SerializationError.invalidObject
      }
      let data = try JSONSerialization.data(withJSONObject: json)
      try? writer.write(data)
    })
  }
}
