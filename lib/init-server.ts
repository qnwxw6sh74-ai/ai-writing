/**
 * 服务端初始化模块
 *
 * 在 Next.js 首次请求时加载，确保所有后台服务启动：
 * - 免费配额从 DB 恢复
 * - 未确认文章配额回收定时器
 */

let initialized = false

export async function initServer(): Promise<void> {
  if (initialized) return
  initialized = true

  // 延迟导入以避免模块级循环依赖
  const { restoreFreeQuotaFromDB } = await import("@/lib/free-quota")
  await restoreFreeQuotaFromDB()

  // 触发 abandoned-generate 模块加载（启动 setInterval）
  await import("@/lib/abandoned-generate")

  console.log("[init-server] 服务初始化完成：免费配额已恢复，配额回收定时器已启动")
}
