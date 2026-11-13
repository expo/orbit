// Spike: run Node (hermes-node) inside the menu bar's own Hermes runtime.
//
// Hooks EXReactNativeFactory's `host:didInitializeRuntime:` (JS thread) and
// attaches a HermesNodeEmbedder to RN's jsi::Runtime. Node's libuv loop is
// driven from RN's JS thread through the RuntimeScheduler, and JS reaches Node
// through `globalThis.__nodeRequire(id)`; no Node globals other than `process`
// are installed, so RN's own timers, console, URL, etc. are untouched.

#import <Foundation/Foundation.h>
#import <objc/runtime.h>

#include <jsi/jsi.h>
#include <react/renderer/runtimescheduler/RuntimeScheduler.h>
#include <react/renderer/runtimescheduler/RuntimeSchedulerBinding.h>

#include <hermes/node-compat/runtime/hermes_node_embedder.h>

#include <memory>

using hermes::node_compat::HermesNodeEmbedder;
using hermes::node_compat::HermesNodeEmbedderHost;
using hermes::node_compat::HermesNodeInstanceConfig;

namespace {

/// Host context for one runtime: posts Node's loop iterations onto RN's JS
/// thread. Holds the scheduler weakly so a torn-down runtime drops the task.
struct HostContext {
  std::weak_ptr<facebook::react::RuntimeScheduler> scheduler;
};

void postToJSThread(void *data, void (*fn)(void *), void *arg) {
  auto *ctx = static_cast<HostContext *>(data);
  if (auto scheduler = ctx->scheduler.lock()) {
    scheduler->scheduleWork([fn, arg](facebook::jsi::Runtime &) { fn(arg); });
  }
}

void AttachHermesNode(facebook::jsi::Runtime &runtime) {
  auto binding = facebook::react::RuntimeSchedulerBinding::getBinding(runtime);
  if (!binding) {
    NSLog(@"[hermes-node] no RuntimeSchedulerBinding; not attaching");
    return;
  }

  // Leaked on purpose for the spike: the embedder must outlive the runtime
  // (GC finalizers reach its state), and we don't hook runtime teardown yet.
  auto *ctx = new HostContext{binding->getRuntimeScheduler()};
  HermesNodeEmbedderHost host;
  host.postToJSThread = postToJSThread;
  host.data = ctx;

  HermesNodeInstanceConfig config;
  config.argv = {"orbit"};
  config.installGlobals = false;
  config.setupStdio = true;

  NSDate *start = [NSDate date];
  auto embedder = HermesNodeEmbedder::attach(runtime, config, host);
  if (!embedder) {
    NSLog(@"[hermes-node] attach failed");
    return;
  }
  embedder->installRequire("__nodeRequire");
  NSLog(@"[hermes-node] attached in %.1f ms", -[start timeIntervalSinceNow] * 1000);
  embedder.release();
}

} // namespace

@interface HermesNodeSpike : NSObject
@end

@implementation HermesNodeSpike

static IMP sOriginalDidInitializeRuntime = nullptr;

static void SwizzledDidInitializeRuntime(id self, SEL _cmd, id host, facebook::jsi::Runtime &runtime) {
  ((void (*)(id, SEL, id, facebook::jsi::Runtime &))sOriginalDidInitializeRuntime)(self, _cmd, host, runtime);
  AttachHermesNode(runtime);
}

+ (void)load {
  Class cls = NSClassFromString(@"EXReactNativeFactory");
  Method m = cls ? class_getInstanceMethod(cls, @selector(host:didInitializeRuntime:)) : nullptr;
  if (!m) {
    NSLog(@"[hermes-node] EXReactNativeFactory host:didInitializeRuntime: not found");
    return;
  }
  sOriginalDidInitializeRuntime = method_setImplementation(m, (IMP)SwizzledDidInitializeRuntime);
}

@end
