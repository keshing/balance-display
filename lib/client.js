window.__ModuleLoader__.load({
  id: 'balance-display',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    var react = require('react')
    //#region balance display cell
    const NS = 'balanceDisplay'
    const zh = {
      'cell.label': '余额',
      'cell.tooltip': '查看账户余额',
      'pop.title': '账户余额',
      'pop.total': '总余额',
      'pop.granted': '赠送余额',
      'pop.toppedUp': '充值余额',
      'pop.available': '可用',
      'pop.unavailable': '不可用',
      'pop.refresh': '刷新',
      'pop.loading': '加载中…',
      'pop.fail': '获取失败',
      'pop.none': '未设置显示余额',
      'settings.nav': '余额显示',
      'settings.title': '余额显示设置',
      'settings.hint': '勾选要在余额弹窗中显示的字段，并用按钮调整上下顺序。',
      'settings.up': '上移',
      'settings.down': '下移',
      'settings.refresh': '刷新间隔',
      'settings.refreshHint': '余额自动刷新的时间间隔，最小 10 秒，只能填整数。',
      'settings.refreshInvalid': '刷新间隔不能小于 10 秒，且必须为整数。',
      'settings.hours': '小时',
      'settings.minutes': '分钟',
      'settings.seconds': '秒',
      'settings.apply': '设置',
      'settings.cancel': '取消',
      'settings.reset': '重置'
    }
    const en = {
      'cell.label': 'Balance',
      'cell.tooltip': 'View account balance',
      'pop.title': 'Account balance',
      'pop.total': 'Total balance',
      'pop.granted': 'Granted balance',
      'pop.toppedUp': 'Topped-up balance',
      'pop.available': 'Available',
      'pop.unavailable': 'Unavailable',
      'pop.refresh': 'Refresh',
      'pop.loading': 'Loading…',
      'pop.fail': 'Failed to load',
      'pop.none': 'No balance fields configured',
      'settings.nav': 'Balance display',
      'settings.title': 'Balance display settings',
      'settings.hint': 'Choose which fields the balance popover shows, then reorder them with the buttons.',
      'settings.up': 'Move up',
      'settings.down': 'Move down',
      'settings.refresh': 'Refresh interval',
      'settings.refreshHint': 'How often the balance auto-refreshes. Minimum 10 seconds, integers only.',
      'settings.refreshInvalid': 'The refresh interval must be an integer of at least 10 seconds.',
      'settings.hours': 'Hours',
      'settings.minutes': 'Minutes',
      'settings.seconds': 'Seconds',
      'settings.apply': 'Apply',
      'settings.cancel': 'Cancel',
      'settings.reset': 'Reset'
    }
    const inject = ['slots', 'locale', 'timer']
    const SYMBOL = (currency) => currency === 'CNY' ? '¥' : currency + ' '
    // Ordered, selectable balance rows: key -> locale key -> balance field accessor.
    const FIELD_DEFS = [
      { key: 'total', labelKey: 'pop.total', valueOf: (b) => b.amount },
      { key: 'granted', labelKey: 'pop.granted', valueOf: (b) => b.granted },
      { key: 'toppedUp', labelKey: 'pop.toppedUp', valueOf: (b) => b.toppedUp }
    ]
    const DEFAULT_FIELDS = ['total', 'granted', 'toppedUp']
    const DEFAULT_REFRESH_SECONDS = 300
    const MIN_REFRESH_SECONDS = 10
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'balance-display: dictionaries')
      const t = ctx.locale.bind(NS)
      const css = [
        '.dyn-balance-wrap{position:relative;display:flex;flex:1 1 0%;min-width:0;align-items:center}',
        // Wide sidebar: pill (icon + label), matching the Settings/Cordis footer actions.
        '.dyn-balance-cell{cursor:pointer;box-sizing:border-box;width:100%;height:49px;margin:8px 0 0;color:var(--dsw-alias-label-primary);background:0 0;border:none;border-radius:12px;flex:none;align-items:center;gap:8px;padding:0 8px 0 6px;font-family:inherit;font-size:14px;display:inline-flex;user-select:none}',
        '.dyn-balance-cell:hover{background:var(--dsw-alias-interactive-bg-hover-solid,rgba(128,128,128,.12))}',
        '.dyn-balance-glyph{font-weight:700;font-size:15px;line-height:1;flex:none}',
        '.dyn-balance-cell-label{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}',
        '.dyn-balance-cell--error{color:var(--dsw-alias-state-error-primary)}',
        // Rail (collapsed) sidebar: circular icon only, like Settings.
        '.dyn-balance-cell--rail{width:36px;height:36px;margin:8px 0 10px;border-radius:50%;justify-content:center;gap:0;padding:0}',
        '.dyn-balance-cell--rail .dyn-balance-cell-label{display:none}',
        '.dyn-balance-pop{position:fixed;z-index:10000;pointer-events:auto;min-width:190px;background:var(--dsw-alias-bg-overlay,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.25));border-radius:8px;padding:10px 12px;box-shadow:0 4px 16px rgba(0,0,0,.14);color:var(--dsw-alias-label-primary,inherit);font-size:12px;line-height:1.7}',
        'body[data-ds-dark-theme] .dyn-balance-pop{background:color-mix(in srgb,var(--dsw-alias-bg-overlay) 55%,var(--dsw-specific-sidebar-fill) 45%)}',
        '.dyn-balance-pop-title{font-weight:600;margin-bottom:6px}',
        '.dyn-balance-pop-row{display:flex;justify-content:space-between;gap:14px}',
        '.dyn-balance-pop-row+.dyn-balance-pop-row{margin-top:2px}',
        '.dyn-balance-pop-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;border-top:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.2));padding-top:6px}',
        '.dyn-balance-pop-status{font-size:11px;color:var(--dsw-alias-label-secondary,inherit)}',
        '.dyn-balance-pop-refresh{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:4px;padding:2px 8px;cursor:pointer;background:transparent;color:var(--dsw-alias-label-secondary,inherit);font-size:12px}',
        '.dyn-balance-pop-refresh:hover{border-color:var(--dsw-alias-brand-primary,rgba(128,128,128,.5));color:var(--dsw-alias-label-primary,inherit)}',
        '.dyn-balance-pop--error{color:var(--dsw-alias-state-error-primary,inherit)}',
        '.dyn-balance-pop--muted{color:var(--dsw-alias-label-secondary,inherit)}',
        '.dyn-balance-settings{display:flex;flex-direction:column;gap:8px;padding:4px 0;font-size:13px}',
        '.dyn-balance-settings-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);margin-bottom:2px}',
        '.dyn-balance-settings-hint{font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:4px}',
        '.dyn-balance-field-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.15));border-radius:6px;background:var(--dsw-alias-bg-layer-1,transparent)}',
        '.dyn-balance-field-row--off{opacity:.55}',
        '.dyn-balance-field-name{flex:1;color:var(--dsw-alias-label-primary)}',
        '.dyn-balance-field-btn{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.25));border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;cursor:pointer;padding:2px 6px;line-height:1.4}',
        '.dyn-balance-field-btn:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,rgba(128,128,128,.5));color:var(--dsw-alias-label-primary)}',
        '.dyn-balance-field-btn:disabled{opacity:.35;cursor:default}',
        '.dyn-balance-refresh-block{margin-top:14px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.15))}',
        '.dyn-balance-refresh-label{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}',
        '.dyn-balance-refresh-hint{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:2px}',
        '.dyn-balance-refresh-row{display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap}',
        '.dyn-balance-refresh-field{display:inline-flex;align-items:center;gap:4px}',
        '.dyn-balance-refresh-input{box-sizing:border-box;width:72px;height:30px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:6px;background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-primary);font-size:13px;text-align:center;padding:0 4px}',
        '.dyn-balance-refresh-input:focus{outline:2px solid var(--dsw-alias-brand-primary,#3964fe);outline-offset:1px}',
        '.dyn-balance-refresh-input::-webkit-outer-spin-button,.dyn-balance-refresh-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}',
        '.dyn-balance-refresh-input[type=number]{-moz-appearance:textfield;appearance:textfield}',
        '.dyn-balance-refresh-unit{font-size:12px;color:var(--dsw-alias-label-secondary)}',
        '.dyn-balance-refresh-error{font-size:12px;color:var(--dsw-alias-state-error-primary);margin-top:6px}',
        '.dyn-balance-actions{display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.15))}',
        '.dyn-balance-actions-btn{border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));border-radius:6px;background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-primary);font-size:13px;cursor:pointer;padding:6px 16px;line-height:1.4}',
        '.dyn-balance-actions-btn:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,rgba(128,128,128,.5));background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08))}',
        '.dyn-balance-actions-btn--disabled{opacity:.4;cursor:default}',
        '.dyn-balance-switch{position:relative;display:inline-flex;flex:none;width:32px;height:18px;border:none;border-radius:9px;background:var(--dsw-alias-border-l2,rgba(128,128,128,.35));cursor:pointer;padding:0;transition:background .15s ease}',
        '.dyn-balance-switch[aria-checked="true"]{background:var(--dsw-alias-brand-primary,#3964fe)}',
        '.dyn-balance-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#3964fe);outline-offset:1px}',
        '.dyn-balance-switch-knob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .15s ease}',
        '.dyn-balance-switch[aria-checked="true"] .dyn-balance-switch-knob{transform:translateX(14px)}',
        '.dyn-balance-nav-glyph{font-weight:700;font-size:15px;line-height:1;flex:none}'
      ].join('\n')
      ctx.effect(() => {
        const tagId = 'balance-display/styles'
        if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="balance-display/styles"]') === null) {
          const tag = document.createElement('style')
          tag.dataset.plugin = 'balance-display'
          tag.dataset.pluginCss = tagId
          tag.textContent = css
          document.head.appendChild(tag)
        }
        return () => {
          if (typeof document !== 'undefined') {
            const tag = document.querySelector('style[data-plugin-css="balance-display/styles"]')
            if (tag && tag.parentNode) tag.parentNode.removeChild(tag)
          }
        }
      }, 'balance-display: styles')
      // Durable settings: ordered, selectable balance rows + refresh interval.
      // Read/write through the plugin's own same-origin route, because the
      // api-proxy settings RPC only exposes its allow-listed namespaces.
      const readSettings = () => {
        let alive = true
        fetch('/api/balance/settings', { cache: 'no-store' }).then((response) => {
          return response.text().then((text) => ({ status: response.status, text }))
        }).then(({ status, text }) => {
          if (!alive) return
          let payload
          try {
            payload = JSON.parse(text)
          } catch (_) {
            payload = null
          }
          if (status !== 200 || payload === null || payload.ok === false) {
            setSnapshot({ fields: null, refreshSeconds: null })
            return
          }
          setSnapshot({
            fields: Array.isArray(payload.fields) ? payload.fields : null,
            refreshSeconds: Number.isInteger(payload.refreshSeconds) ? payload.refreshSeconds : null
          })
        }).catch(() => {
          if (alive) setSnapshot({ fields: null, refreshSeconds: null })
        })
        return () => { alive = false }
      }
      const writeSettings = (patch) => {
        return fetch('/api/balance/settings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
          cache: 'no-store'
        }).then((response) => {
          return response.text().then((text) => ({ status: response.status, text }))
        }).then(({ status, text }) => {
          if (status === 200) return true
          let payload
          try {
            payload = JSON.parse(text)
          } catch (_) {
            payload = null
          }
          throw new Error((payload && payload.error) || 'HTTP ' + status)
        })
      }
      // Simple shared store: balance snapshot, popover open state, anchor rect, settings.
      const listeners = /* @__PURE__ */ new Set()
      let snapshot = {
        balance: { phase: 'loading' },
        fields: null,
        refreshSeconds: null,
        open: false,
        anchor: null
      }
      const setSnapshot = (patch) => {
        snapshot = Object.assign({}, snapshot, patch)
        for (const fn of [...listeners]) fn(snapshot)
      }
      const subscribe = (fn) => {
        listeners.add(fn)
        return () => {
          listeners.delete(fn)
        }
      }
      const useStore = () => {
        const [value, setValue] = react.useState(snapshot)
        react.useEffect(() => subscribe((next) => setValue(next)), [])
        return value
      }
      // Keep the store in sync with durable settings: fetch on mount, then
      // re-fetch after every successful write (settings section re-opens also
      // trigger readSettings from the component).
      const refreshSettings = () => { readSettings() }
      ctx.effect(() => {
        refreshSettings()
      }, 'balance-display: settings sync')
      // The ¥ icon button in the sidebar footer.
      function BalanceButton(props) {
        const t = props.t
        const view = useStore()
        const ref = react.useRef(null)
        const load = react.useCallback(() => {
          let alive = true
          setSnapshot({ balance: { phase: 'loading' } })
          fetch('/api/balance', { cache: 'no-store' }).then((response) => {
            return response.text().then((text) => ({ status: response.status, text }))
          }).then(({ status, text }) => {
            if (!alive) return
            let payload
            try {
              payload = JSON.parse(text)
            } catch (_) {
              payload = null
            }
            if (status !== 200 || payload === null || payload.ok === false) {
              setSnapshot({ balance: { phase: 'error', message: (payload && payload.error) || 'HTTP ' + status } })
              return
            }
            const info = Array.isArray(payload.balance_infos) && payload.balance_infos[0]
              ? payload.balance_infos[0]
              : {}
            setSnapshot({
              balance: {
                phase: 'ok',
                amount: Number(info.total_balance) || 0,
                granted: Number(info.granted_balance) || 0,
                toppedUp: Number(info.topped_up_balance) || 0,
                currency: String(info.currency || 'CNY'),
                isAvailable: payload.is_available === true
              }
            })
          }).catch((error) => {
            if (!alive) return
            setSnapshot({ balance: { phase: 'error', message: String(error && error.message || error) } })
          })
          return () => { alive = false }
        }, [])
        react.useEffect(() => load(), [load])
        // Auto-refresh at the configured interval (seconds, min 10). Re-arm when it changes.
        react.useEffect(() => {
          const seconds = Number.isInteger(view.refreshSeconds) ? view.refreshSeconds : DEFAULT_REFRESH_SECONDS
          const ms = Math.max(MIN_REFRESH_SECONDS, seconds) * 1000
          return ctx.interval(() => load(), ms)
        }, [load, view.refreshSeconds])
        react.useEffect(() => {
          if (!view.open) return
          const onDown = (event) => {
            const target = event.target
            if (target && typeof target.closest === 'function') {
              if (target.closest('.dyn-balance-wrap, .dyn-balance-pop')) return
            }
            setSnapshot({ open: false, anchor: null })
          }
          document.addEventListener('mousedown', onDown)
          return () => document.removeEventListener('mousedown', onDown)
        }, [view.open])
        const toggle = () => {
          if (!view.open) {
            const rect = ref.current ? ref.current.getBoundingClientRect() : null
            setSnapshot({
              open: true,
              anchor: rect ? {
                top: rect.top,
                bottom: rect.bottom,
                right: rect.right
              } : null
            })
            if (view.balance.phase !== 'loading') load()
          } else {
            setSnapshot({ open: false, anchor: null })
          }
        }
        return react.createElement('span', { className: 'dyn-balance-wrap', ref },
          react.createElement('button', {
            className: 'dyn-balance-cell' + (view.balance.phase === 'error' ? ' dyn-balance-cell--error' : '') + (props.wide ? '' : ' dyn-balance-cell--rail'),
            onClick: toggle,
            title: t('cell.tooltip'),
            'aria-haspopup': 'true',
            'aria-expanded': view.open ? 'true' : 'false'
          },
            react.createElement('span', { className: 'dyn-balance-glyph' }, '¥'),
            props.wide ? react.createElement('span', { className: 'dyn-balance-cell-label' }, t('cell.label')) : null))
      }
      // The popover rendered on the frame-wide overlay, positioned right of the button.
      function BalancePopover(props) {
        const t = props.t
        const view = useStore()
        if (!view.open || !view.anchor) return null
        const { bottom, right } = view.anchor
        const style = {
          left: right + 6,
          top: bottom - 2,
          transform: 'translateY(-100%)'
        }
        const refresh = () => {
          setSnapshot({ balance: { phase: 'loading' } })
          fetch('/api/balance', { cache: 'no-store' }).then((response) => {
            return response.text().then((text) => ({ status: response.status, text }))
          }).then(({ status, text }) => {
            let payload
            try {
              payload = JSON.parse(text)
            } catch (_) {
              payload = null
            }
            if (status !== 200 || payload === null || payload.ok === false) {
              setSnapshot({ balance: { phase: 'error', message: (payload && payload.error) || 'HTTP ' + status } })
              return
            }
            const info = Array.isArray(payload.balance_infos) && payload.balance_infos[0]
              ? payload.balance_infos[0]
              : {}
            setSnapshot({
              balance: {
                phase: 'ok',
                amount: Number(info.total_balance) || 0,
                granted: Number(info.granted_balance) || 0,
                toppedUp: Number(info.topped_up_balance) || 0,
                currency: String(info.currency || 'CNY'),
                isAvailable: payload.is_available === true
              }
            })
          }).catch((error) => {
            setSnapshot({ balance: { phase: 'error', message: String(error && error.message || error) } })
          })
        }
        let body
        if (view.balance.phase === 'loading') {
          body = react.createElement('div', { className: 'dyn-balance-pop--muted' }, t('pop.loading'))
        } else if (view.balance.phase === 'error') {
          body = react.createElement(react.Fragment, null,
            react.createElement('div', { className: 'dyn-balance-pop--error' },
              t('pop.fail') + ': ' + view.balance.message),
            react.createElement('div', { className: 'dyn-balance-pop-foot' },
              react.createElement('span', { className: 'dyn-balance-pop-status' }, ''),
              react.createElement('button', {
                className: 'dyn-balance-pop-refresh',
                onClick: refresh
              }, t('pop.refresh')))
          )
        } else {
          const fields = view.fields === null ? DEFAULT_FIELDS : view.fields
          const symbol = SYMBOL(view.balance.currency)
          const money = (value) => symbol + value.toFixed(2)
          const rows = []
          for (const key of fields) {
            const def = FIELD_DEFS.find((d) => d.key === key)
            if (!def) continue
            const value = def.valueOf(view.balance)
            rows.push(react.createElement('div', { className: 'dyn-balance-pop-row', key: key },
              react.createElement('span', null, t(def.labelKey)),
              react.createElement('span', null, money(value))))
          }
          if (rows.length === 0) {
            rows.push(react.createElement('div', { className: 'dyn-balance-pop--muted', key: 'none' }, t('pop.none')))
          }
          body = react.createElement(react.Fragment, null,
            ...rows,
            react.createElement('div', { className: 'dyn-balance-pop-foot' },
              react.createElement('span', { className: 'dyn-balance-pop-status' },
                view.balance.isAvailable ? t('pop.available') : t('pop.unavailable')),
              react.createElement('button', {
                className: 'dyn-balance-pop-refresh',
                onClick: refresh
              }, t('pop.refresh')))
          )
        }
        return react.createElement('div', {
          className: 'dyn-balance-pop',
          role: 'dialog',
          style
        },
          react.createElement('div', { className: 'dyn-balance-pop-title' }, t('pop.title')),
          body)
      }
      // Inline switch used by the settings page rows.
      function InlineSwitch(props) {
        return react.createElement('button', {
          type: 'button',
          role: 'switch',
          'aria-checked': props.checked ? 'true' : 'false',
          'aria-label': props['aria-label'],
          className: 'dyn-balance-switch',
          onClick: props.onChange
        }, react.createElement('span', { className: 'dyn-balance-switch-knob' }))
      }
      // The settings page: draft fields/order/refresh, applied via Settings,
      // discarded via Cancel, restored to defaults via Reset.
      function BalanceSettingsSection(props) {
        const t = props.t
        const view = useStore()
        react.useEffect(() => { readSettings() }, [])
        // Loaded (committed) values, used as the Cancel target.
        const committedFields = view.fields === null ? DEFAULT_FIELDS : view.fields
        const committedRefresh = view.refreshSeconds === null ? DEFAULT_REFRESH_SECONDS : view.refreshSeconds
        const splitRefresh = (total) => ({
          h: String(Math.floor(total / 3600)),
          m: String(Math.floor((total % 3600) / 60)),
          s: String(total % 60)
        })
        // Draft state: fields order + refresh h/m/s inputs.
        const [draftFields, setDraftFields] = react.useState(committedFields)
        const [draft, setDraft] = react.useState(() => splitRefresh(committedRefresh))
        const [invalid, setInvalid] = react.useState(false)
        // When committed settings arrive/change (first load, after apply), sync the draft.
        react.useEffect(() => {
          setDraftFields(committedFields)
          setDraft(splitRefresh(committedRefresh))
          setInvalid(false)
        }, [view.fields, view.refreshSeconds])
        const draftRefreshSeconds = () => {
          const h = parseInt(draft.h, 10)
          const m = parseInt(draft.m, 10)
          const s = parseInt(draft.s, 10)
          const parts = [h, m, s]
          if (parts.some((value) => !Number.isInteger(value) || value < 0)) return null
          const total = h * 3600 + m * 60 + s
          return total < MIN_REFRESH_SECONDS ? null : total
        }
        const setField = (key, enabled) => {
          setDraftFields(enabled
            ? [...draftFields, key]
            : draftFields.filter((k) => k !== key))
        }
        const move = (index, delta) => {
          const target = index + delta
          if (target < 0 || target >= draftFields.length) return
          const next = [...draftFields]
          const tmp = next[index]
          next[index] = next[target]
          next[target] = tmp
          setDraftFields(next)
        }
        const applyRefresh = (next) => {
          setDraft(next)
          setInvalid(draftRefreshSeconds() === null)
        }
        const applySettings = () => {
          const total = draftRefreshSeconds()
          if (total === null) {
            setInvalid(true)
            return
          }
          setSnapshot({ fields: draftFields, refreshSeconds: total })
          writeSettings({ fields: draftFields, refreshSeconds: total }).then(() => readSettings()).catch((error) => {
            console.error('[balance-display] write failed:', error)
            readSettings()
          })
        }
        const cancelChanges = () => {
          setDraftFields(committedFields)
          setDraft(splitRefresh(committedRefresh))
          setInvalid(false)
        }
        const resetDefaults = () => {
          setDraftFields(DEFAULT_FIELDS)
          setDraft(splitRefresh(DEFAULT_REFRESH_SECONDS))
          setInvalid(false)
        }
        const dirty = JSON.stringify(draftFields) !== JSON.stringify(committedFields)
          || draftRefreshSeconds() !== committedRefresh
        const rows = []
        for (let i = 0; i < draftFields.length; i++) {
          const key = draftFields[i]
          const def = FIELD_DEFS.find((d) => d.key === key)
          if (!def) continue
          rows.push(react.createElement('div', { className: 'dyn-balance-field-row', key: key },
            react.createElement(InlineSwitch, {
              checked: true,
              onChange: () => setField(key, false),
              'aria-label': t(def.labelKey)
            }),
            react.createElement('span', { className: 'dyn-balance-field-name' }, t(def.labelKey)),
            react.createElement('button', {
              type: 'button',
              className: 'dyn-balance-field-btn',
              onClick: () => move(i, -1),
              disabled: i === 0,
              'aria-label': t('settings.up')
            }, '↑'),
            react.createElement('button', {
              type: 'button',
              className: 'dyn-balance-field-btn',
              onClick: () => move(i, 1),
              disabled: i === draftFields.length - 1,
              'aria-label': t('settings.down')
            }, '↓')))
        }
        for (const def of FIELD_DEFS) {
          if (draftFields.includes(def.key)) continue
          rows.push(react.createElement('div', {
            className: 'dyn-balance-field-row dyn-balance-field-row--off',
            key: def.key
          },
            react.createElement(InlineSwitch, {
              checked: false,
              onChange: () => setField(def.key, true),
              'aria-label': t(def.labelKey)
            }),
            react.createElement('span', { className: 'dyn-balance-field-name' }, t(def.labelKey)),
            react.createElement('span', { className: 'dyn-balance-field-btn' }, '↑'),
            react.createElement('span', { className: 'dyn-balance-field-btn' }, '↓')))
        }
        const refreshField = (labelKey, valueKey) => {
          return react.createElement('label', { className: 'dyn-balance-refresh-field', key: valueKey },
            react.createElement('input', {
              type: 'number',
              min: 0,
              step: 1,
              className: 'dyn-balance-refresh-input',
              value: draft[valueKey],
              onChange: (event) => applyRefresh(Object.assign({}, draft, { [valueKey]: event.target.value }))
            }),
            react.createElement('span', { className: 'dyn-balance-refresh-unit' }, t(labelKey)))
        }
        const actionBtn = (labelKey, onClick, disabled) => react.createElement('button', {
          type: 'button',
          className: 'dyn-balance-actions-btn' + (disabled ? ' dyn-balance-actions-btn--disabled' : ''),
          onClick,
          disabled
        }, t(labelKey))
        return react.createElement('div', { className: 'dyn-balance-settings' },
          react.createElement('div', { className: 'dyn-balance-settings-title' }, t('settings.title')),
          react.createElement('div', { className: 'dyn-balance-settings-hint' }, t('settings.hint')),
          ...rows,
          react.createElement('div', { className: 'dyn-balance-refresh-block' },
            react.createElement('div', { className: 'dyn-balance-refresh-label' }, t('settings.refresh')),
            react.createElement('div', { className: 'dyn-balance-refresh-hint' }, t('settings.refreshHint')),
            react.createElement('div', { className: 'dyn-balance-refresh-row' },
              refreshField('settings.hours', 'h'),
              refreshField('settings.minutes', 'm'),
              refreshField('settings.seconds', 's')),
            invalid ? react.createElement('div', { className: 'dyn-balance-refresh-error' }, t('settings.refreshInvalid')) : null),
          react.createElement('div', { className: 'dyn-balance-actions' },
            actionBtn('settings.apply', applySettings, invalid),
            actionBtn('settings.cancel', cancelChanges, !dirty && !invalid),
            actionBtn('settings.reset', resetDefaults, false)))
      }
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'balance-view',
        order: 20,
        locale: NS
      }, BalanceButton))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'balance-popover',
        order: 0,
        locale: NS
      }, BalancePopover))
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'balance-display',
        order: 30,
        label: () => t('settings.nav'),
        locale: NS
      }, BalanceSettingsSection))
      // Replace the settings-nav gear with a ¥ glyph for the Balance display
      // section, matched by its localized label text — robust to any future
      // section ordering, unlike a positional selector. React re-renders the
      // nav rows, so re-sync on mutations.
      ctx.effect(() => {
        if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
        const navLabelText = () => t('settings.nav')
        const sync = () => {
          const label = navLabelText()
          const cells = document.querySelectorAll('[class$="navCell"]')
          for (const cell of cells) {
            const labelNode = cell.querySelector('[class$="navLabel"]')
            if (!labelNode || labelNode.textContent !== label) continue
            const icon = cell.querySelector('[class$="navIcon"]')
            if (icon) icon.style.display = 'none'
            let glyph = cell.querySelector('.dyn-balance-nav-glyph')
            if (!glyph) {
              glyph = document.createElement('span')
              glyph.className = 'dyn-balance-nav-glyph'
              glyph.textContent = '¥'
              cell.insertBefore(glyph, cell.firstChild)
            }
          }
        }
        sync()
        const observer = new MutationObserver(sync)
        observer.observe(document.body, { childList: true, subtree: true })
        return () => observer.disconnect()
      }, 'balance-display: settings nav glyph')
    }
    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
