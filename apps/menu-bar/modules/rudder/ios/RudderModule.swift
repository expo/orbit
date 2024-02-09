import ExpoModulesCore
import Rudder

public class RudderModule: Module {

  public func definition() -> ModuleDefinition {
    Name("Rudder")
    
    Constants([
      "appVersion": self.appContext?.constants?.constants()["nativeAppVersion"],
    ])

    AsyncFunction("load") { (writeKey: String, dataPlaneUrl:String) in
      let config = RSConfig(writeKey: writeKey)
        .dataPlaneURL(dataPlaneUrl)
        .trackLifecycleEvents(false)

      RSClient.sharedInstance().configure(with: config)
    }.runOnQueue(.main)

    AsyncFunction("track") { (event: String, properties: [String: Any], context: [String: [String: Any]]?) in
      let option = RSOption()
      
      if let context = context, !context.isEmpty {
        for (key, value) in context { 
          option.putCustomContext(value, withKey: key)
        }
      }
      
      RSClient.sharedInstance().track(event, properties:properties, option: option)
    }
  }
}
