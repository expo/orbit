import AuthenticationServices

public class WebAuthContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
  public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    var anchor: ASPresentationAnchor?

    DispatchQueue.main.sync {
      anchor = NSApp.mainWindow
    }

    return anchor ?? ASPresentationAnchor()
  }
}
