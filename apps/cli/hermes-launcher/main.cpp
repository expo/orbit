// Minimal Node host on a shared Hermes: makeHermesRuntime from the app's
// hermesvm.framework + hermes-node's HermesNodeInstance. Runs a CJS entry
// point like `node <entry> args...`.
#include <hermes/node-compat/runtime/hermes_node_instance.h>
#include <hermes/hermes.h>
#include <hermes/Public/RuntimeConfig.h>
#include <cstdio>
#include <string>

using namespace hermes::node_compat;

int main(int argc, char **argv) {
  if (argc < 2) {
    std::fprintf(stderr, "usage: %s <entry.js> [args...]\n", argv[0]);
    return 2;
  }
  auto rt = facebook::hermes::makeHermesRuntime(
      hermes::vm::RuntimeConfig::Builder()
          .withMicrotaskQueue(true)
          .withEnableAsyncGenerators(true)
          .withES6BlockScoping(true)
          .build());
  auto node = HermesNodeInstance::create(*rt);
  if (!node)
    return 1;
  HermesNodeInstanceConfig config;
  config.argv.push_back(argv[0]);
  for (int i = 1; i < argc; ++i)
    config.argv.push_back(argv[i]);
  int exitCode = node->bootstrap(config) ? 0 : 1;

  napi_env env = node->env();
  napi_handle_scope scope;
  napi_open_handle_scope(env, &scope);
  if (exitCode == 0) {
    napi_value global, load, path, result;
    napi_get_global(env, &global);
    napi_get_named_property(env, global, "__loadUserScript", &load);
    napi_create_string_utf8(env, argv[1], NAPI_AUTO_LENGTH, &path);
    if (napi_call_function(env, global, load, 1, &path, &result) != napi_ok) {
      printAndClearException(env);
      exitCode = 1;
    }
  }
  if (exitCode == 0) {
    for (;;) {
      node->drainTicks();
      if (!uv_loop_alive(node->loop()))
        break;
      uv_run(node->loop(), UV_RUN_DEFAULT);
    }
  }
  exitCode = node->emitExit(exitCode);
  node->closeStdio();
  node->beginShutdown();
  napi_close_handle_scope(env, scope);
  node->finishShutdown();
  node->destroyEnv();
  rt.reset();
  node.reset();
  return exitCode;
}
