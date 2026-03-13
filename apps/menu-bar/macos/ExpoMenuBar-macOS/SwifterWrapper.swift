import Foundation
import Swifter
import Dispatch

private let PORTS = [35783, 47909, 44171, 50799]
private let DEFAULT_WHITELISTED_DOMAINS = ["expo.dev", "expo.test", "exp.host", "localhost"]

@objc class SwifterWrapper: NSObject {
  let server = HttpServer()
  private var whitelistedDomains: [String] = DEFAULT_WHITELISTED_DOMAINS
  private var fileMonitorSource: DispatchSourceFileSystemObject?

  override init() {
    super.init()

    loadTrustedSources()
    watchTrustedSources()

    server.middleware.append { request in
      guard let origin = request.headers["origin"] else {
        return .forbidden
      }

      if !self.whitelistedDomains.contains(self.extractRootDomain(from: origin)) {
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

      if !self.whitelistedDomains.contains(self.extractRootDomain(from: urlParam)) {
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

  private func loadTrustedSources() {
    let homeDir = NSHomeDirectory()
    let authPath = "\(homeDir)/.expo/orbit/auth.json"

    guard let data = FileManager.default.contents(atPath: authPath),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let sources = json["trustedSources"] as? [String] else {
      whitelistedDomains = DEFAULT_WHITELISTED_DOMAINS
      return
    }

    let customDomains = extractDomainsFromPatterns(sources)
    whitelistedDomains = DEFAULT_WHITELISTED_DOMAINS + customDomains
  }

  private func watchTrustedSources() {
    let homeDir = NSHomeDirectory()
    let authPath = "\(homeDir)/.expo/orbit/auth.json"
    let fd = open(authPath, O_EVTONLY)
    guard fd >= 0 else { return }

    let source = DispatchSource.makeFileSystemObjectSource(
      fileDescriptor: fd,
      eventMask: [.write, .rename],
      queue: DispatchQueue.global(qos: .utility)
    )
    source.setEventHandler { [weak self] in
      self?.loadTrustedSources()
    }
    source.setCancelHandler {
      close(fd)
    }
    source.resume()
    fileMonitorSource = source
  }

  private func extractDomainsFromPatterns(_ patterns: [String]) -> [String] {
    var domains = Set<String>()
    for pattern in patterns {
      var clean = pattern
      if clean.hasSuffix("/**") { clean = String(clean.dropLast(3)) }
      else if clean.hasSuffix("/*") { clean = String(clean.dropLast(2)) }
      clean = clean.replacingOccurrences(of: "://*.", with: "://wildcard.")

      guard let url = URL(string: clean), let host = url.host else { continue }

      let components = host.components(separatedBy: ".")
      let rootDomain: String
      if components.count > 2 {
        rootDomain = components.suffix(2).joined(separator: ".")
      } else {
        rootDomain = host
      }

      if !rootDomain.isEmpty {
        domains.insert(rootDomain)
      }
    }
    return Array(domains)
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
