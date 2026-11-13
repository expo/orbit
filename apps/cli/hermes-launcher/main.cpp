// orbit-cli: a minimal Node host on the Hermes that Expo Orbit.app already
// ships (makeHermesRuntime from its hermesvm.framework) plus hermes-node's
// HermesNodeInstance.
//
// Runs the CLI from `<this executable>.hbc` (the bundled CLI, precompiled with
// a hermesc matching the framework) when present, so `orbit-cli <command>`
// works like the pkg binary did. Otherwise the first argument is the entry
// point, like `node <entry.js|.hbc> args...`.
#include <hermes/node-compat/runtime/hermes_node_instance.h>
#include <hermes/hermes.h>
#include <hermes/Public/RuntimeConfig.h>
#include <mach-o/dyld.h>
#include <sys/stat.h>

#include <climits>
#include <cstdio>
#include <cstdlib>
#include <string>

using namespace hermes::node_compat;

/// `<absolute path of this executable>.hbc`, or empty if there is none.
static std::string siblingBytecode() {
  char path[PATH_MAX];
  uint32_t size = sizeof(path);
  char resolved[PATH_MAX];
  if (_NSGetExecutablePath(path, &size) != 0 || !realpath(path, resolved))
    return {};
  std::string hbc = std::string(resolved) + ".hbc";
  struct stat st;
  return stat(hbc.c_str(), &st) == 0 ? hbc : std::string();
}

int main(int argc, char **argv) {
  std::string entry = siblingBytecode();
  int firstArg = 1;
  if (entry.empty()) {
    if (argc < 2) {
      std::fprintf(stderr, "usage: %s <entry.js|.hbc> [args...]\n", argv[0]);
      return 2;
    }
    entry = argv[1];
    firstArg = 2;
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
  // process.argv = [execPath, entry, ...args], as under node.
  config.argv.push_back(argv[0]);
  config.argv.push_back(entry);
  for (int i = firstArg; i < argc; ++i)
    config.argv.push_back(argv[i]);
  int exitCode = node->bootstrap(config) ? 0 : 1;

  napi_env env = node->env();
  napi_handle_scope scope;
  napi_open_handle_scope(env, &scope);
  if (exitCode == 0) {
    napi_value global, load, path, result;
    napi_get_global(env, &global);
    napi_get_named_property(env, global, "__loadUserScript", &load);
    napi_create_string_utf8(env, entry.c_str(), NAPI_AUTO_LENGTH, &path);
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
