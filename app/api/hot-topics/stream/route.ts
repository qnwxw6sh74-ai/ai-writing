/**
 * SSE 端点 — 热点数据实时推送
 *
 * 客户端连接后立即收到当前缓存数据，之后每 15 分钟缓存刷新时自动推送。
 * Nginx 需对该路径关闭缓冲：
 *   location /api/hot-topics/stream {
 *       proxy_buffering off;
 *       proxy_cache off;
 *       proxy_http_version 1.1;
 *       chunked_transfer_encoding on;
 *   }
 */
import { subscribeToHotTopics } from "@/lib/hot-topics"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeToHotTopics((data) => {
        if (closed) return
        try {
          const payload = JSON.stringify(data)
          controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`))
        } catch {
          // 客户端已断开
        }
      })

      // 心跳（30s），防止 Nginx/代理超时断开
      const heartbeat = setInterval(() => {
        if (closed) return
        try { controller.enqueue(new TextEncoder().encode(": heartbeat\n\n")) } catch {}
      }, 30_000)

      // 清理
      const cleanup = () => {
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
      }

      // 客户端断开时清理（App Router 无 request.signal，用 AbortSignal 超时兜底）
      // Next.js App Router 的 ReadableStream 在客户端断开时会自动 cancel
      const origCancel = (controller as any).__cancel
      controller.closed?.then?.(cleanup).catch?.(cleanup)
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // 告知 Nginx 禁用缓冲
    },
  })
}
