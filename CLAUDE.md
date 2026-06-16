# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

公众号爆文 AI 写作平台，部署在阿里云 ECS（1.6GB RAM，宝塔面板，PM2）。生产域名 `w.wyrunwu.com`，Nginx 反代到 `localhost:3000`。同机部署 V免签支付系统（PHP，端口 8080，域名 `p.wyrunwu.com`）。

## 启动 & 构建

```bash
npm run dev        # 本地开发（Turbopack）
npm run build      # 生产构建
npm run start      # 生产启动（PM2 管理）
npm run lint       # ESLint
```

生产构建时服务器内存紧张，必须：
```bash
pm2 stop ecosystem.config.js   # 先停 Next.js
NODE_OPTIONS="--max-old-space-size=256" npm run build
pm2 start ecosystem.config.js
```

`ecosystem.config.js` 定义 PM2 配置（cwd: `/www/wwwroot/w.wyrunwu.com`，端口 3000，`--max-old-space-size=256`）。

## 核心架构

### 技术栈
- Next.js 16.2.6（App Router，Turbopack）
- MySQL（mysql2 连接池，`lib/db.ts`）
- DeepSeek API（OpenAI 兼容格式，`lib/ai-client.ts`）— 文字生成
- Agnes AI API（OpenAI 兼容 Images 格式，`lib/image-gen.ts`）— 图片生成，`AGNES_API_KEY` 环境变量
- JWT 认证（jose 库，admin + user 双通道）
- Tailwind CSS v4 + lucide-react 图标

### 认证体系（两层）

1. **管理员认证**：`lib/auth.ts` — JWT (`admin_token` cookie)，`middleware.ts` 保护 `/admin/*` 和 `/api/admin/*`
   - JWT_SECRET 和 ADMIN_PASSWORD 必须设置环境变量，**无硬编码回退值**。未设置时启动报错或拒绝登录
   - 登出调用 `/api/auth/logout`，将 admin_token 加入内存黑名单（5 分钟 TTL）+ 清除两个 cookie
2. **用户认证**：`lib/auth-user.ts` — JWT (`user_token` cookie)，`middleware.ts` 保护 `/style-lab`、`/pricing`、`/profile` 等页面及 `/api/payment/`、`/api/style/` 路由
   - 验证后通过 `x-user-payload` header 注入用户信息到下游

JWT 密钥统一使用 `JWT_SECRET` 环境变量，启动时若未设置 `lib/auth.ts` 和 `lib/auth-user.ts` 均会 `throw new Error`。

### 积分/额度系统（`lib/credits.ts`）

双维度计算：
- **免费额度**：按 IP 统计（`credits_log` 表，近 90 天），环境变量 `FREE_CREDITS` 设置上限（默认 10）
- **充值额度**：仅登录用户（userId 为纯数字），从 `credits_recharge` 表汇总
- 优先级：先扣免费额度（写 IP），免费用完再扣充值（写 user_id）
- 统一使用 `Number(val) || 0` 模式，避免 `parseInt(val) || 3` 在 val=0 时的错误

生成 API 入口调用 `checkCredits()` 检查，`deductCredits()` 记录（或自动扣费）。

### 支付流程

V免签 PHP 支付（`lib/payment.ts`）：
1. 前端同步 `window.open('about:blank')` → 异步 `POST /api/payment/create` 获取订单号
2. 前端 `location.href` 跳转到 `p.wyrunwu.com/payPage/pay.html?orderId=xxx`
3. 用户扫码支付 → V免签 PHP 回调 `http://localhost:3000/api/payment/callback`（必须内网直连，绕过 Nginx）
4. 回调验证签名 → 更新 `payment_orders` → 写入 `credits_recharge`
5. 前端轮询 `/api/payment/check`（3s 间隔，30 次上限）

关键配置：`PHP_API_BASE=http://localhost:8080`（内网直连），`NEXT_PUBLIC_SITE_URL=https://w.wyrunwu.com`（用户浏览器），`PAY_PAGE_BASE_URL` 可选（默认等于 `SITE_URL`）。

回调安全：IP 校验仅允许 localhost 变体（`127.0.0.1`、`::1`、`::ffff:127.0.0.1`）；状态机去重（已 paid 订单直接返回）；`credits_recharge` 表 `pay_id` 唯一键防重复加款。

支付轮询 hook 已抽取到 `lib/usePaymentPolling.ts`（提供 `startPoll`/`stopPoll`/`polling`/`result`），但目前 `PaymentModal.tsx` 和 `PricingClient.tsx` **尚未接入**，仍各自内联重复逻辑。

### AI 调用链路

```
lib/ai-models.ts (resolveModel) → lib/ai-client.ts (chatCompletion)
     ↑ DB: ai_models 表                       ↑ OpenAI 兼容格式
     ↓ 关键词/keyword_triggers 匹配            ↓ DeepSeek / OpenAI / Claude
```

- `MOCK_AI=true` 时走 `lib/mock-ai.ts`（客户端渲染，无 API 调用）
- 生成缓存：`lib/generate-cache.ts` — 相同关键词 1 小时内复用（MD5 哈希，200 条上限）
- Prompt 模板：从 `prompt_templates` 表按 domain 匹配加载
- 风格定制：从 `site_config` 表读 `user_style_{userId}`（待迁移到独立 `user_styles` 表）
- 输入校验：keyword 最长 200 字符，`/api/generate` 和 `/api/image/generate` 均做校验

### 热点话题（`lib/hot-topics.ts`）

双源聚合 → 去重 → AI 分析上升趋势 → 内存缓存 + SSE 推送：
- 数据源：腾讯新闻 API + 天行数据 API（聚合微博/抖音/百度/知乎）
- 缓存 TTL：2 小时，自动定时刷新
- 夜间 0:00-9:00 不自动刷新，节省 API 成本
- AI 分析：DeepSeek 返回 JSON（maxTokens=8000，含截断修复容错）
- SSE 端点：`/api/hot-topics/stream`
- 前端匹配：`HotKeywords.tsx` 使用 `includes` 模糊匹配（AI 可能改写标题措辞）

### Rate Limiting（`lib/rate-limit.ts`）

纯内存实现（重启丢失）：
- 生成冷却：90 秒内同一用户/IP 不能重复生成，确认后解除
- 认证频率限制：login 10次/分、register 3次/分、forgotPassword 2次/分，超限返回 429 + `Retry-After` 头
- IP 自动扣费：未登录用户每 3 次生成自动扣 1 次额度
- 定期清理：generate tracker 30 分钟，auth tracker 5 分钟

### 安全防护

- **XSS**：`lib/sanitize.ts` 提供轻量级 HTML 净化（去 script/style/on* 属性/javascript: 伪协议/iframe），PDF 导出前调用
- **安全响应头**：`next.config.ts` 已配置 `X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`HSTS`（2年）、`Referrer-Policy`
- **HTTPS 强制**：`middleware.ts` 检测 `x-forwarded-proto: http` 对 `wyrunwu.com` 域名 301 跳转
- **API Key 脱敏**：管理后台 GET `/api/admin/models` 返回 `api_key.slice(0,4) + '****' + api_key.slice(-4)`
- **CSRF**：Cookie `sameSite: 'strict'`（V免签回调豁免，因为是服务器到服务器调用）
- **Error Boundary**：`components/ErrorBoundary.tsx` — class 组件，客户端崩溃时显示回退 UI + 重新加载按钮

### 配置存储

两层配置优先级：`site_config` 表 ← 环境变量 `.env.local`

- `lib/config.ts` 提供 `getConfig(key, fallback)` 和 `getConfigs(keys)`，自动处理 JSON 解析和 DB 不可用降级
- 首页内容（轮播图、功能卡片、用户评价等）全部从数据库加载，有硬编码默认降级

### 路由结构要点

| 路径 | 说明 |
|------|------|
| `/` | 首页，SSR 加载配置后 hydration |
| `/generate` | 文章生成（需登录后使用） |
| `/title-generator` | 标题生成器 |
| `/image-generator` | AI 图片生成（Agnes AI，1 积分/次） |
| `/style-lab` | 风格实验室（需登录） |
| `/hot-topics` | 热点话题页，SSE 实时推送 |
| `/pricing` | 套餐页（trial 套餐已隐藏） |
| `/admin/dashboard` | 管理后台（admin_token 认证） |
| `/api/payment/callback` | V免签异步回调（白名单 IP 校验） |
| `/sitemap.ts` | 动态 sitemap（14 条路由，可配置优先级） |
| `/robots.ts` | robots.txt，禁止 `/admin/` |

### 数据库表（核心）

- `users` — 用户（含 `gen_count` 自动扣费计数）
- `payment_orders` — 支付订单（`pay_id` 关联 V免签订单号）
- `credits_log` — 额度消耗记录（按 `user_identifier` 区分 IP/用户）
- `credits_recharge` — 充值记录
- `site_config` — 站点配置（JSON 值，key-value）
- `ai_models` — AI 模型库（支持按关键词触发不同模型）
- `prompt_templates` — Prompt 模板（按 domain 匹配）
- `pricing_plans` — 套餐（含 `is_trial` 字段，1 元体验套餐已隐藏）
- `generate_history` — 生成历史

### 已知技术债务

- `app/api/invite/stats/route.ts` 仍有 `"https://w.wyrunwu.com"` 硬编码回退域名
- `lib/config.ts` 混用 `parseInt` 和 `Number` 模式，`parseInt(String(val)) || 3` 在 val=0 时有 bug
- 用户风格数据仍存 `site_config` 表（key `user_style_{userId}`），待迁移到独立 `user_styles` 表
- `usePaymentPolling.ts` hook 已抽取但 `PaymentModal.tsx` 和 `PricingClient.tsx` 未接入

## 关键约定

- 所有 API 返回中文错误消息（`"关键词不能为空"` 而非 "Keyword required"）
- 回调 URL 用内网 `localhost`（绕过 Nginx），支付页 URL 用公网域名
- 夜间节省成本：热点 0-9 点不自动刷新，AI 分析失败保留旧缓存
- 服务端 `NODE_OPTIONS="--max-old-space-size=256"` 限制堆内存（服务器仅 1.6GB）
- `next.config.ts` 已配置 `typescript.ignoreBuildErrors: true`（服务器内存不足以跑 tsc）
- 密码重置防用户枚举：无论邮箱是否存在，统一返回 "如果该邮箱已注册，您将收到一封密码重置邮件"
