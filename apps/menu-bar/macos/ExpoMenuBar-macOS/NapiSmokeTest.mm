// Spike: prove Node-API works on the menu bar's own Hermes runtime.
// Hooks EXReactNativeFactory's `host:didInitializeRuntime:` (JS thread), creates a
// napi_env on RN's jsi::Runtime and installs `globalThis.__napiHello` built purely
// through Node-API, then calls it back through both Node-API and JSI.

#import <Foundation/Foundation.h>
#import <objc/runtime.h>

#include <jsi/hermes-interfaces.h>
#include <jsi/jsi.h>

#include "hermes_napi.h"

#include <string>

static napi_value NapiHello(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  double a = 0, b = 0;
  if (argc > 0)
    napi_get_value_double(env, args[0], &a);
  if (argc > 1)
    napi_get_value_double(env, args[1], &b);

  napi_value result;
  napi_create_object(env, &result);
  napi_value sum;
  napi_create_double(env, a + b, &sum);
  napi_set_named_property(env, result, "sum", sum);

  const napi_node_version *nodeVersion = nullptr;
  uint32_t napiVersion = 0;
  napi_get_version(env, &napiVersion);
  napi_value ver;
  napi_create_uint32(env, napiVersion, &ver);
  napi_set_named_property(env, result, "napiVersion", ver);
  (void)nodeVersion;

  napi_value buf;
  void *data = nullptr;
  napi_create_buffer_copy(env, 5, "hello", &data, &buf);
  napi_set_named_property(env, result, "buffer", buf);
  return result;
}

static void InstallNapiSmokeTest(facebook::jsi::Runtime &runtime) {
  auto *ihermes = facebook::jsi::castInterface<facebook::hermes::IHermes>(&runtime);
  if (!ihermes) {
    NSLog(@"[napi-smoke] runtime is not Hermes");
    return;
  }
  // Leaked on purpose for the spike; a real integration destroys it on host teardown.
  napi_env env = hermes_napi_create_env(ihermes->getVMRuntimeUnsafe(), nullptr);
  if (!env) {
    NSLog(@"[napi-smoke] hermes_napi_create_env failed");
    return;
  }

  napi_value global, fn;
  napi_get_global(env, &global);
  napi_create_function(env, "napiHello", NAPI_AUTO_LENGTH, NapiHello, nullptr, &fn);
  napi_set_named_property(env, global, "__napiHello", fn);

  // Call back via JSI on the same runtime to prove both APIs see the same heap.
  try {
    auto json = runtime.evaluateJavaScript(
        std::make_shared<facebook::jsi::StringBuffer>(
            "(function(){ var r = globalThis.__napiHello(2, 3);"
            " return JSON.stringify({sum: r.sum, napiVersion: r.napiVersion,"
            " buffer: String.fromCharCode.apply(null, new Uint8Array(r.buffer.buffer, r.buffer.byteOffset, r.buffer.length)),"
            " isUint8Array: r.buffer instanceof Uint8Array}); })()"),
        "napi-smoke.js");
    NSLog(@"[napi-smoke] JSI -> napi result: %s", json.getString(runtime).utf8(runtime).c_str());
  } catch (const facebook::jsi::JSIException &e) {
    NSLog(@"[napi-smoke] JSI call failed: %s", e.what());
  }
}

@interface NapiSmokeTest : NSObject
@end

@implementation NapiSmokeTest

static IMP sOriginalDidInitializeRuntime = nullptr;

static void SwizzledDidInitializeRuntime(id self, SEL _cmd, id host, facebook::jsi::Runtime &runtime) {
  ((void (*)(id, SEL, id, facebook::jsi::Runtime &))sOriginalDidInitializeRuntime)(self, _cmd, host, runtime);
  InstallNapiSmokeTest(runtime);
}

+ (void)load {
  Class cls = NSClassFromString(@"EXReactNativeFactory");
  Method m = cls ? class_getInstanceMethod(cls, @selector(host:didInitializeRuntime:)) : nullptr;
  if (!m) {
    NSLog(@"[napi-smoke] EXReactNativeFactory host:didInitializeRuntime: not found");
    return;
  }
  sOriginalDidInitializeRuntime = method_setImplementation(m, (IMP)SwizzledDidInitializeRuntime);
}

@end
