# balance-display（余额显示）

一个用于 DeepSeek Harness（DSH）的持久化插件：在侧边栏底部显示你的 DeepSeek 账户余额，支持可配置的余额弹窗、专属设置页，以及余额过低时的预警通知。

## 功能特性

- **侧边栏 ¥ 按钮**，样式与原生「设置」按钮一致：
  - 侧边栏展开 → 胶囊样式，带文字标签（「¥ 余额」）
  - 收起为窄栏 → 圆形图标，与设置按钮相同
- **点击** → 图标右侧弹出余额详情
  - 总余额 / 赠送余额 / 充值余额 三行明细
  - 可用状态 + 手动刷新按钮
  - 渲染在全局浮层上，不会被对话区域遮挡
- **设置页**（设置 → 「余额显示」）：
  - 选择要显示的余额字段（行内开关）
  - 用 ↑ / ↓ 按钮调整字段显示顺序
  - 可配置自动刷新间隔（时 / 分 / 秒，最小 10 秒，仅整数）
  - 余额预警阈值（支持多个）
  - 草稿管理模式：**设置 / 取消 / 重置** 三个操作按钮
  - 配置持久化到 `~/.dsh/settings.yaml`
- **预警通知**：余额跌破设定阈值时，右下角弹出提示（常驻，需手动关闭）。支持多个阈值；同时触发多个时只显示最低的一个，新预警会顶掉旧弹窗；余额回升到阈值以上再次跌破会重新提醒。设置页提供「测试提醒」按钮，无需等待真实余额变动即可预览弹窗效果。
- 按配置的间隔自动刷新；余额获取失败时 ¥ 图标变红

## 工作原理

- **Host 端**（`lib/index.js`）：
  - 注册 `balance-display` 设置命名空间（字段、刷新间隔、预警阈值）
  - `GET /api/balance` 使用 `DEEPSEEK_API_KEY` 凭据代理 `https://api.deepseek.com/user/balance`（每次请求时通过凭据服务解析，密钥不离开 Host）
  - `GET/POST /api/balance/settings` 读写持久化配置（该插件自建同源接口，因为 api-proxy 的 settings RPC 只暴露白名单命名空间）
- **Client 端**（`lib/client.js`）：手写的 `window.__ModuleLoader__` bundle，注册侧边栏底部按钮、全局浮层弹窗、预警弹窗堆栈和设置页。所有 UI 样式使用主题的 `--dsw-*` 令牌。

## 安装方法

1. 将包复制到 DSH profile 的 node_modules：

   ```
   cp -r balance-display ~/.dsh/profiles/node_modules/
   ```

2. 在 profile 组合配置（`~/.dsh/profiles/web/cordis.patch.yml`）中注册插件行：

   ```yaml
   - insert:
       - id: balance-display
         name: 'balance-display'
   ```

3. 确保已配置 `DEEPSEEK_API_KEY` 凭据（在 Models 设置页或 `~/.dsh/.credentials.yaml`）。

4. 重启 `dsh web` 并刷新页面。

## 环境要求

- 带 Web profile 的 DeepSeek Harness（DSH，`dsh web`）
- Node.js 支持全局 `fetch`（Node 18+）
- 有效的 `DEEPSEEK_API_KEY`

## 许可证

MIT
