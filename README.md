# balance-display

A persistent DeepSeek Harness (DSH) plugin that shows your DeepSeek account balance in the sidebar footer, with a configurable balance popover, a dedicated settings page, and low-balance alert notifications.

## Features

- **¥ icon button** in the sidebar footer, styled to match the native Settings button:
  - Wide sidebar → pill with label ("¥ Balance")
  - Collapsed rail → circular icon, like Settings
- **Click** → a popover appears to the right showing your remaining balance
  - Total / granted / topped-up balance rows
  - Availability status and a manual refresh button
  - Rendered on the frame-wide overlay, never covered by the conversation column
- **Settings page** (Settings → "余额显示" / "Balance display"):
  - Choose which balance rows appear (inline switches)
  - Reorder rows with ↑ / ↓ buttons
  - Configurable auto-refresh interval (hours / minutes / seconds, min 10 s, integers only)
  - Low-balance alert thresholds (multiple values supported)
  - Draft model with **Apply / Cancel / Reset** actions
  - Configuration is persisted in `~/.dsh/settings.yaml`
- **Alert notifications**: when the balance drops below a configured threshold, a toast appears in the bottom-right corner (persists until closed). Multiple thresholds are supported; when several fire at once, only the lowest is shown, and a newer alert replaces the old one. The toast re-alerts after the balance rises back above the threshold and falls again. A **Test alert** button lets you preview the toast without waiting for a real drop.
- Auto-refresh at the configured interval; the ¥ icon turns red while the balance fetch fails

## How it works

- **Host half** (`lib/index.js`):
  - Registers a `balance-display` settings namespace (fields, refresh interval, alert thresholds)
  - `GET /api/balance` proxies `https://api.deepseek.com/user/balance` using the `DEEPSEEK_API_KEY` credential (resolved per request via the credentials service — the key never leaves the host)
  - `GET/POST /api/balance/settings` read/write the durable configuration (the plugin owns this same-origin surface because the api-proxy settings RPC only exposes allow-listed namespaces)
- **Client half** (`lib/client.js`): a hand-written `window.__ModuleLoader__` bundle that registers the sidebar footer action, the frame overlay popover, the alert toast stack, and the settings section. All UI styling uses the theme's `--dsw-*` tokens.

## Installation

1. Copy the package into your DSH profile's node_modules:

   ```
   cp -r balance-display ~/.dsh/profiles/node_modules/
   ```

2. Register the plugin row in your profile composition (`~/.dsh/profiles/web/cordis.patch.yml`):

   ```yaml
   - insert:
       - id: balance-display
         name: 'balance-display'
   ```

3. Make sure a `DEEPSEEK_API_KEY` credential is configured (the Models settings page or `~/.dsh/.credentials.yaml`).

4. Restart `dsh web` and refresh the page.

## Requirements

- DeepSeek Harness (DSH) with a web profile (`dsh web`)
- Node.js with a global `fetch` (Node 18+)
- A valid `DEEPSEEK_API_KEY`

## License

MIT
