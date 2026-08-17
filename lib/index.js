/**
 * balance-display — persistent Host half.
 *
 * Exposes two same-origin JSON routes:
 *   GET  /api/balance         — proxies the DeepSeek user-balance endpoint
 *   GET  /api/balance/settings — read the durable field configuration
 *   POST /api/balance/settings — write the durable field configuration
 *
 * The configuration lives in the `balance-display` settings namespace, which
 * the Host registers locally. The browser client talks to these routes
 * directly (same-origin fetch) because the api-proxy settings RPC only
 * exposes its own allow-listed namespaces; this plugin owns its surface.
 */
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'

const name = 'balance-display'
const inject = ['webServer']

const BALANCE_ENDPOINT = 'https://api.deepseek.com/user/balance'
const CREDENTIAL_REF = 'DEEPSEEK_API_KEY'

/** Settings namespace owned by this plugin. */
const SETTINGS_NAMESPACE = settingsNamespace('balance-display')
/** Default visible balance rows, top to bottom. */
const DEFAULT_FIELDS = ['total', 'granted', 'toppedUp']
/** Default auto-refresh interval in seconds (5 minutes). */
const DEFAULT_REFRESH_SECONDS = 300
/** Minimum allowed refresh interval in seconds. */
const MIN_REFRESH_SECONDS = 10
/** Durable settings schema: ordered, selectable balance rows + refresh interval. */
const SettingsSchema = z.object({
  fields: z.array(z.string()).default(DEFAULT_FIELDS),
  refreshSeconds: z.number().step(1).min(MIN_REFRESH_SECONDS).default(DEFAULT_REFRESH_SECONDS)
})
/** Valid field keys, in a fixed canonical order for normalization. */
const VALID_FIELDS = ['total', 'granted', 'toppedUp']

/** Write a JSON body to a response. */
function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(payload))
}

/** Read the response body text. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function apply(ctx) {
  // Register the durable settings section when a settings provider is mounted.
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(SETTINGS_NAMESPACE, SettingsSchema)
  })

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/balance',
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        json(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      try {
        const credentials = ctx.get('credentials')
        if (credentials === undefined) {
          json(res, 500, { ok: false, error: 'credentials service is not mounted' })
          return
        }
        const credential = await credentials.resolve(CREDENTIAL_REF)
        if (credential === undefined || credential.value.length === 0) {
          json(res, 500, { ok: false, error: `credential ${CREDENTIAL_REF} is not configured` })
          return
        }
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 15000)
        let response
        try {
          response = await fetch(BALANCE_ENDPOINT, {
            headers: { Authorization: `Bearer ${credential.value}` },
            signal: controller.signal
          })
        } finally {
          clearTimeout(timer)
        }
        const body = await response.text()
        res.writeHead(response.status, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        })
        res.end(body)
      } catch (error) {
        json(res, 500, { ok: false, error: String(error && error.message || error) })
      }
    }
  }), 'balance-display: balance route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/balance/settings',
    handler: async (req, res) => {
      const settings = ctx.get('settings')
      if (settings === undefined) {
        json(res, 500, { ok: false, error: 'settings service is not mounted' })
        return
      }
      const read = () => {
        const section = settings.get(SETTINGS_NAMESPACE)
        const raw = section && Array.isArray(section.fields) ? section.fields : DEFAULT_FIELDS
        const fields = raw.filter((key) => VALID_FIELDS.includes(key))
        const refreshSeconds = section && Number.isInteger(section.refreshSeconds)
          ? Math.max(MIN_REFRESH_SECONDS, section.refreshSeconds)
          : DEFAULT_REFRESH_SECONDS
        return { fields, refreshSeconds }
      }
      if (req.method === 'GET' || req.method === 'HEAD') {
        json(res, 200, { ok: true, ...read() })
        return
      }
      if (req.method === 'POST') {
        try {
          const text = await readBody(req)
          let payload
          try {
            payload = JSON.parse(text)
          } catch (_) {
            json(res, 400, { ok: false, error: 'invalid JSON body' })
            return
          }
          const patch = {}
          if (payload.fields !== undefined) {
            if (!Array.isArray(payload.fields)) {
              json(res, 400, { ok: false, error: 'fields must be an array of strings' })
              return
            }
            patch.fields = payload.fields.filter((key) => typeof key === 'string' && VALID_FIELDS.includes(key))
          }
          if (payload.refreshSeconds !== undefined) {
            if (!Number.isInteger(payload.refreshSeconds) || payload.refreshSeconds < MIN_REFRESH_SECONDS) {
              json(res, 400, { ok: false, error: `refreshSeconds must be an integer of at least ${MIN_REFRESH_SECONDS}` })
              return
            }
            patch.refreshSeconds = payload.refreshSeconds
          }
          await settings.update(SETTINGS_NAMESPACE, patch)
          json(res, 200, { ok: true, ...read() })
        } catch (error) {
          json(res, 400, { ok: false, error: String(error && error.message || error) })
        }
        return
      }
      json(res, 405, { ok: false, error: 'method not allowed' })
    }
  }), 'balance-display: settings route')
}

export { DEFAULT_FIELDS, DEFAULT_REFRESH_SECONDS, MIN_REFRESH_SECONDS, SETTINGS_NAMESPACE, apply, inject, name }
