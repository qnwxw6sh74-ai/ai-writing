/**
 * 安全的 fetch 包装 — 区分网络故障与服务器异常
 *
 * 问题：catch { setError("网络错误") } 会掩盖服务器 500 错误。
 * 当 API 路由崩溃返回 HTML 而非 JSON 时，res.json() 抛出 SyntaxError，
 * 用户看到的是误导性的"网络错误"。
 *
 * 用法：
 *   const { res, data, error } = await apiFetch("/api/generate", { method: "POST", body: {...} })
 *   if (error) { setError(error); return }
 */

export class ApiError extends Error {
  code: "NETWORK" | "SERVER_ERROR" | "PARSE_ERROR"
  httpStatus?: number

  constructor(message: string, code: "NETWORK" | "SERVER_ERROR" | "PARSE_ERROR", httpStatus?: number) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.httpStatus = httpStatus
  }

  /** 适合展示给用户的错误消息 */
  getUserMessage(): string {
    switch (this.code) {
      case "NETWORK":
        return "网络连接失败，请检查网络后重试"
      case "SERVER_ERROR":
        return this.httpStatus
          ? `服务器异常 (${this.httpStatus})，请稍后重试`
          : "服务器异常，请稍后重试"
      case "PARSE_ERROR":
        return "服务器返回格式异常，请稍后重试"
    }
  }
}

interface ApiFetchResult<T = unknown> {
  /** Response 对象（可能为 null） */
  res: Response | null
  /** 解析后的 JSON 数据（成功时） */
  data: T | null
  /** ApiError 对象（失败时） */
  error: ApiError | null
}

/**
 * 带类型化错误处理的 fetch 包装
 *
 * - 网络故障 → error.code = "NETWORK"
 * - 服务器返回非 2xx → error.code = "SERVER_ERROR"，data 仍包含服务端返回的 JSON（如有）
 * - 响应体非 JSON → error.code = "PARSE_ERROR"
 */
export async function apiFetch<T = Record<string, unknown>>(
  url: string,
  options?: RequestInit,
): Promise<ApiFetchResult<T>> {
  let res: Response
  try {
    res = await fetch(url, options)
  } catch {
    return {
      res: null,
      data: null,
      error: new ApiError("网络连接失败", "NETWORK"),
    }
  }

  let data: T
  try {
    data = await res.json()
  } catch {
    // 响应体不是 JSON（通常是 HTML 500 错误页）
    return {
      res,
      data: null,
      error: new ApiError(`服务器返回了非 JSON 响应`, "PARSE_ERROR", res.status),
    }
  }

  if (!res.ok) {
    return {
      res,
      data,
      error: new ApiError(
        (data as Record<string, unknown>)?.error as string || `请求失败 (${res.status})`,
        "SERVER_ERROR",
        res.status,
      ),
    }
  }

  return { res, data, error: null }
}

/**
 * 从 ApiError 提取适合展示的用户消息
 */
export function getUserErrorMessage(err: unknown, fallback = "网络错误，请稍后重试"): string {
  if (err instanceof ApiError) return err.getUserMessage()
  return fallback
}
