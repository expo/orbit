import ExpoModulesCore
import AuthenticationServices

public class WebAuthenticationSessionModule: Module {
  var authContextProvider = WebAuthContextProvider()
  var authSession: ASWebAuthenticationSession?

  public func definition() -> ModuleDefinition {
    Name("WebAuthenticationSession")

    AsyncFunction("openAuthSessionAsync") { (urlString: String, promise: Promise) in
      guard let url = URL(string: urlString) else {
        promise.reject("INVALID_URL", "Invalid URL provided")
        return
      }

      authSession = ASWebAuthenticationSession(url: url, callbackURLScheme: "expo-orbit") { callbackURL, error in
        if let error = error {
          promise.reject("AUTH_SESSION_ERROR", error.localizedDescription)
        } else {
          if let callbackURL = callbackURL {
            promise.resolve(["type": "success", "url": callbackURL.absoluteString])
          } else {
            promise.resolve(["type": "cancel"])
          }
        }
      }

      if #available(macOS 10.15, *) {
         authSession?.presentationContextProvider = authContextProvider
      }
      authSession?.start()
    }
  }
}
