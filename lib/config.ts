import pool from "@/lib/db"

/**
 * 查询付费功能是否启用（读取 site_config 中 enable_payment）
 */
export async function getPaymentEnabled(): Promise<boolean> {
  try {
    const val = await getConfig("enable_payment", "true")
    // getConfig 可能 JSON.parse("true") → boolean true，用 String() 兜底
    return String(val) === "true"
  } catch {
    return true
  }
}

/**
 * 获取免费使用次数（环境变量优先于 DB 配置）
 */
export async function getFreeCredits(): Promise<number> {
  // 环境变量优先（.env.local 是权威配置来源）
  const envVal = parseInt(process.env.FREE_CREDITS || "0")
  if (envVal > 0) return envVal

  // 回退：读 DB site_config
  try {
    const val = await getConfig("free_credits", "")
    if (val) return parseInt(String(val)) || 3
  } catch { /* ignore */ }

  return 3
}

/**
 * 从 site_config 表读取配置值，数据库不可用或 key 不存在时返回 fallback
 */
export async function getConfig<T = string>(key: string, fallback: T): Promise<T> {
  try {
    const [rows] = await pool.execute(
      "SELECT `value` FROM site_config WHERE `key` = ?",
      [key]
    ) as any[]
    if (rows.length > 0 && rows[0].value) {
      // JSON 类型的值尝试解析，text 类型直接返回
      try {
        return JSON.parse(rows[0].value) as T
      } catch {
        return rows[0].value as T
      }
    }
  } catch { /* DB 不可用 */ }
  return fallback
}

/**
 * 读取多个配置项，返回 key→value 映射
 */
export async function getConfigs(keys: string[]): Promise<Record<string, any>> {
  const result: Record<string, any> = {}
  for (const key of keys) {
    result[key] = null
  }
  try {
    const [rows] = await pool.execute(
      `SELECT \`key\`, \`value\` FROM site_config WHERE \`key\` IN (${keys.map(() => "?").join(",")})`,
      keys
    ) as any[]
    for (const row of rows) {
      if (row.value) {
        try { result[row.key] = JSON.parse(row.value) } catch { result[row.key] = row.value }
      }
    }
  } catch { /* DB 不可用 */ }
  return result
}
