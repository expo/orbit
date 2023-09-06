import Foundation
import Swifter
import Dispatch

private let PORTS = [35783, 47909, 44171, 50799]
private let WHITELISTED_DOMAINS = ["expo.dev", "expo.test", "exp.host"]

@objc class SwifterWrapper: NSObject {
  let server = HttpServer()

  override init() {
    super.init()

    server.middleware.append { request in
      guard let origin = request.headers["origin"], (request.headers["referer"] != nil) else {
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

    server.GET["/orbit/open"] = { request in
      guard let (_, urlParam) = request.queryParams.first(where: { $0.0 == "url" }),
            let decodedURLParam = urlParam.removingPercentEncoding else {
        return .badRequest(nil)
      }

      if !WHITELISTED_DOMAINS.contains(self.extractRootDomain(from: urlParam)) {
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
    guard let originUrl = URL(string: urlString.removingPercentEncoding ?? ""),
          let hostName = originUrl.host else {
      return ""
    }

    let components = hostName.components(separatedBy: ".")
    if components.count > 2 {
      return components.suffix(2).joined(separator: ".")
    } else {
      return hostName
    }
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
