import { chromium } from 'playwright'

const BASE = 'https://w.wyrunwu.com'
const RESULTS = []
const TIMEOUT = 25000

function log(label, ok, detail = '') {
  const icon = ok ? '✅' : (detail.includes('ERR') ? '⚠️' : '❌')
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ''}`)
  RESULTS.push({ label, ok, detail })
}

async function testPage(browser, path, label, extraChecks = null) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true })
  const page = await ctx.newPage()
  try {
    const res = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: TIMEOUT })
    log(label, res.status() === 200, `HTTP ${res.status()}`)

    if (res.status() === 200 && extraChecks) {
      try { await extraChecks(page) } catch (e) { log(`${label} - check`, false, e.message.slice(0, 60)) }
    }

    // Check for unexpected "网络错误" on page load
    if (res.status() === 200) {
      const body = await page.content().catch(() => '')
      if (body.includes('网络错误') || body.includes('网络连接失败')) {
        log(`${label} — 残留错误文案`, false, '检测到"网络错误"文本')
      }
    }
    return page
  } catch (e) {
    const msg = e.message.slice(0, 80)
    log(label, false, msg)
    return null
  } finally {
    await ctx.close()
  }
}

async function main() {
  console.log('🧪 AI写作平台 — 全站冒烟测试')
  console.log(`🌐 ${BASE}`)
  console.log('═'.repeat(55))

  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-certificate-errors', '--ignore-certificate-errors-spki-list'],
  })

  // ====== 公开页面 ======
  console.log('\n📄 公开页面')
  for (const [path, label] of [
    ['/', '首页'], ['/about', '关于页'], ['/changelog', '更新日志'],
    ['/tutorials', '使用教程'], ['/guestbook', '留言板'],
    ['/robots.txt', 'robots.txt'], ['/sitemap.xml', 'sitemap.xml'],
  ]) {
    await testPage(browser, path, label)
  }

  // ====== 认证页面 + 表单交互 ======
  console.log('\n🔐 认证页面')

  await testPage(browser, '/login', '登录页', async (page) => {
    // Empty form validation
    const emailEl = page.getByPlaceholder(/your@email|邮箱/)
    if (await emailEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailEl.fill('')
      const passEl = page.getByPlaceholder(/密码/)
      if (await passEl.isVisible()) await passEl.fill('')
      await page.getByRole('button', { name: /登录/ }).click()
      await page.waitForTimeout(800)
      const text = await page.locator('body').innerText()
      log('登录 — 空表单校验', text.includes('请输入') || text.includes('不能为空') || text.includes('邮箱'), '')
    }
    // Bad credentials
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.getByPlaceholder(/your@email|邮箱/).fill('noexist@test.com')
    await page.getByPlaceholder(/密码/).fill('wrongpw')
    await page.getByRole('button', { name: /登录/ }).click()
    await page.waitForTimeout(2000)
    const text2 = await page.locator('body').innerText()
    log('登录 — 错误凭证反馈', text2.includes('失败') || text2.includes('未注册') || text2.includes('不正确') || text2.includes('异常') || text2.includes('网络'), '')
  })

  await testPage(browser, '/register', '注册页', async (page) => {
    await page.getByPlaceholder(/your@email|邮箱/).fill('')
    const passEl = page.getByPlaceholder(/至少|密码/)
    if (await passEl.isVisible()) await passEl.fill('')
    await page.getByRole('button', { name: /注册/ }).click()
    await page.waitForTimeout(800)
    const text = await page.locator('body').innerText()
    log('注册 — 空表单校验', text.includes('请输入') || text.includes('不能为空') || text.includes('至少'), '')
  })

  await testPage(browser, '/forgot-password', '忘记密码')
  await testPage(browser, '/admin/login', '管理后台登录')

  // ====== 核心功能 ======
  console.log('\n⚡ 核心功能页面')
  for (const [path, label] of [
    ['/generate', '文章生成'],
    ['/title-generator', '标题生成'],
    ['/image-generator', '图片生成'],
    ['/hot-topics', '热点话题'],
    ['/originality-check', '原创检测'],
  ]) {
    await testPage(browser, path, label)
  }

  // ====== 需登录页面 ======
  console.log('\n🔒 需登录页面 (预期302 → /login)')
  for (const [path, label] of [
    ['/style-lab', '风格实验室'],
    ['/profile', '个人中心'],
  ]) {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true })
    const page = await ctx.newPage()
    try {
      const res = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const redirected = res.url().includes('/login')
      log(label, redirected, redirected ? '302→/login ✅' : `停留在${new URL(res.url()).pathname}`)
    } catch (e) {
      log(label, false, e.message.slice(0, 60))
    }
    await ctx.close()
  }

  // Pricing
  {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true })
    const page = await ctx.newPage()
    try {
      const res = await page.goto(BASE + '/pricing', { waitUntil: 'domcontentloaded', timeout: 15000 })
      const finalPath = new URL(res.url()).pathname
      log('定价页', res.status() === 200 || finalPath === '/' || finalPath === '/login', `HTTP ${res.status()} → ${finalPath}`)
    } catch (e) {
      log('定价页', false, e.message.slice(0, 60))
    }
    await ctx.close()
  }

  // ====== API 端点 ======
  console.log('\n🔌 API JSON 端点')
  const apiCtx = await browser.newContext({ ignoreHTTPSErrors: true })
  const apiPage = await apiCtx.newPage()
  const apiTests = [
    { label: 'GET /api/credits', path: '/api/credits', expectJson: true },
    { label: 'GET /api/models', path: '/api/models', expectJson: true },
    { label: 'GET /api/hot-topics', path: '/api/hot-topics', expectJson: true },
    { label: 'GET /api/guestbook', path: '/api/guestbook', expectJson: true },
    { label: 'POST /api/generate (空关键词→400)', path: '/api/generate', method: 'POST', body: '{}', expectStatus: 400, expectJson: true },
    { label: 'POST /api/auth/login (错误凭证→401)', path: '/api/auth/login', method: 'POST', body: JSON.stringify({ email: 'x@x.com', password: 'x' }), expectStatus: 401, expectJson: true },
  ]
  for (const t of apiTests) {
    try {
      const result = await apiPage.evaluate(async (t) => {
        const opts = { method: t.method || 'GET', headers: { 'Content-Type': 'application/json' } }
        if (t.body) opts.body = t.body
        const r = await fetch('https://w.wyrunwu.com' + t.path, opts)
        const isJson = (r.headers.get('content-type') || '').includes('json')
        return { status: r.status, isJson }
      }, t)
      const statusOk = t.expectStatus ? result.status === t.expectStatus : result.status === 200
      const jsonOk = t.expectJson ? result.isJson : true
      log(t.label, statusOk && jsonOk, `HTTP ${result.status}, ${result.isJson ? 'JSON✅' : 'NOT JSON❌'}`)
    } catch (e) {
      log(t.label, false, e.message.slice(0, 60))
    }
  }
  await apiCtx.close()

  await browser.close()

  // ====== 汇总 ======
  console.log('\n' + '═'.repeat(55))
  const pass = RESULTS.filter(r => r.ok).length
  const fail = RESULTS.filter(r => !r.ok).length
  console.log(`📊 总计: ${RESULTS.length} | ✅ ${pass} | ❌ ${fail}`)

  if (fail > 0) {
    console.log('\n失败/警告项:')
    RESULTS.filter(r => !r.ok).forEach(r => console.log(`  ${r.detail.includes('ERR') ? '⚠️' : '❌'} ${r.label}: ${r.detail}`))
  }
  process.exit(fail > 0 ? 1 : 0)
}
main()
