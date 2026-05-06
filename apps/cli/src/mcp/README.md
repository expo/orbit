# Expo Orbit MCP server

The Orbit CLI ships an MCP (Model Context Protocol) server that lets AI coding agents — Cursor, Claude Code, Claude Desktop — drive your local iOS simulators, Android emulators, and connected devices through Orbit. You ask the agent to "list my simulators" or "check my Android tooling" and it calls into the same code paths the Orbit menu-bar uses.

The server is exposed as a CLI subcommand:

```bash
expo-orbit-cli mcp [--port <number>] [--token <string>]
```

It listens on `127.0.0.1` over HTTP/SSE, gated by a bearer token.

---

## Quick start

### 1. Build the CLI

```bash
yarn install
yarn --cwd apps/cli build
```

### 2. Start the server

```bash
node apps/cli/build/index.js mcp
```

Defaults: port `8765`, token persisted in `~/.expo/orbit/auth.json` (auto-generated on first run). On startup the server prints both:

```
[mcp] Expo Orbit MCP listening on http://127.0.0.1:8765/mcp
[mcp] Token: <hex string>
```

Override either flag for ad-hoc runs:

```bash
node apps/cli/build/index.js mcp --port 9000 --token devtoken
```

### 3. Hook up a client

Add a server entry in your AI client's MCP config. The shape is the same across clients — set the URL to `http://127.0.0.1:<port>/mcp` and pass the token in the `Authorization` header:

```json
{
  "mcpServers": {
    "expo-orbit": {
      "url": "http://127.0.0.1:8765/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

Config locations:

| Client | Path |
|---|---|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor (global) | `~/.cursor/mcp.json` |
| Cursor (per-project) | `<repo>/.cursor/mcp.json` |
| Claude Code | `claude mcp add` or `~/.config/claude-code/mcp.json` |

After saving the config, restart the client. The tools below should appear in the agent's tool list.

---

## Tools

| Tool | Inputs | Output | Read-only |
|---|---|---|---|
| `list_devices` | `platform?: ios \| android \| tvos \| watchos \| all` (default `all`) | iOS / Android / tvOS / watchOS device arrays | yes |
| `check_tools` | `platform?: ios \| android \| all` (default `all`) | `{ ios?, android?: { success, reason? } }` | yes |
| `get_trusted_sources` | — | `string[]` of allowlisted URL globs | yes |
| `detect_apple_app_type` | `appPath: string` (path to `.app`, `.ipa`, or archive) | `{ deviceType: 'simulator' \| 'device', ... }` | yes |

All current tools are read-only — they don't boot devices, install apps, or change state. Mutating tools (`boot_device`, `install_and_launch`, `launch_update`, etc.) ship in later phases.

---

## Authentication

The MCP server is bound to `127.0.0.1` and rejects any non-local request, but localhost is still reachable by every process on your machine — so the bearer token is required.

- **First run:** a 64-character hex token is generated and stored in `~/.expo/orbit/auth.json` under `mcpToken`. Reuse it across restarts.
- **Override:** pass `--token <value>` for an ephemeral token (not persisted).
- **Rotate:** delete the `mcpToken` field in `user-settings.json` and restart. A fresh token will be generated.

Bad credentials → `401 Unauthorized`. Non-localhost source → `403 Forbidden`.

---

## Dev loop

For iterating on tools without an LLM in the loop, the MCP Inspector is faster than connecting Claude Desktop:

```bash
node apps/cli/build/index.js mcp --port 8765 --token devtoken &
npx @modelcontextprotocol/inspector
```

Then in the Inspector UI, point it at `http://127.0.0.1:8765/mcp` with `Authorization: Bearer devtoken`. You can browse the schema, call tools, and inspect raw JSON-RPC traffic.

You can also exercise it directly with curl:

```bash
curl -sS -X POST http://127.0.0.1:8765/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Authorization: Bearer devtoken' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## How it works

The `mcp` subcommand starts a long-lived Node HTTP server using `@modelcontextprotocol/sdk`'s `StreamableHTTPServerTransport` in stateless mode. Every tool call re-forks the same CLI binary for the underlying subcommand — `list_devices` shells out to `expo-orbit-cli list-devices`, `check_tools` shells out to `expo-orbit-cli check-tools`, and so on.

That means MCP tools inherit the CLI's existing behavior for free: trusted-source URL allowlist, error codes (`UNTRUSTED_SOURCE`, `UNAUTHORIZED_ACCOUNT`, …), session secret resolution, etc. There's no parallel implementation to keep in sync.

When Orbit's menu-bar app starts the MCP server (a future phase), the same CLI binary it already bundles is reused — both the macOS native host and the Electron host on Windows/Linux launch `expo-orbit-cli mcp` the same way they launch any other CLI subcommand.
