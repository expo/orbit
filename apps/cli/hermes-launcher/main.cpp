// orbit-cli: runs the CLI on the Hermes that Expo Orbit.app already ships
// (makeHermesRuntime from Contents/Frameworks/hermesvm.framework), with Node's
// APIs provided by hermes-node (https://github.com/gabrieldonadel/hermes-node).
//
// The CLI itself is `<this executable>.hbc`: apps/cli bundled into one file and
// precompiled with a hermesc built from the same Hermes commit as the
// framework (see build.sh). If there is no such file, the first argument is
// the entry point instead, like `node <entry.js|.hbc> args...`, which is handy
// for development.

#include <hermes/hermes.h>
#include <hermes/node-compat/runtime/hermes_node_instance.h>
#include <hermes/Public/RuntimeConfig.h>

#include <mach-o/dyld.h>
#include <sys/stat.h>

#include <climits>
#include <cstdio>
#include <cstdlib>
#include <string>

using namespace hermes::node_compat;

static bool exists(const std::string &path) {
  struct stat st;
  return stat(path.c_str(), &st) == 0;
}

/// Absolute, symlink-resolved path of this executable. `orbit shell-command`
/// links it into e.g. /usr/local/bin, so argv[0] isn't enough to find the
/// files that ship next to it.
static std::string executablePath() {
  char path[PATH_MAX];
  uint32_t size = sizeof(path);
  char resolved[PATH_MAX];
  if (_NSGetExecutablePath(path, &size) != 0 || !realpath(path, resolved))
    return {};
  return resolved;
}

int main(int argc, char **argv) {
  std::string exe = executablePath();
  std::string dir = exe.substr(0, exe.rfind('/'));

  std::string entry = exe.empty() ? std::string() : exe + ".hbc";
  int firstArg = 1;
  if (entry.empty() || !exists(entry)) {
    if (argc < 2) {
      std::fprintf(stderr, "usage: %s <entry.js|.hbc> [args...]\n", argv[0]);
      return 2;
    }
    entry = argv[1];
    firstArg = 2;
  }

  // ipa-resign runs the anisette and zsign helpers from ORBIT_HELPER_BIN_DIR
  // (pkg used to extract them from its snapshot). They ship in bin/ next to
  // this executable.
  if (!getenv("ORBIT_HELPER_BIN_DIR") && exists(dir + "/bin"))
    setenv("ORBIT_HELPER_BIN_DIR", (dir + "/bin").c_str(), 1);

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

  // Run until both the event loop and the microtask/nextTick queues are idle.
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
