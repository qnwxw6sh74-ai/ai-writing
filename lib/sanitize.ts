/**
 * 轻量级 HTML 净化 — 移除 XSS 攻击向量
 *
 * 用于导出/渲染用户可编辑内容时防护 XSS 注入。
 * 不依赖 DOMPurify，适合轻量场景。
 */

/** 去除 script/style 标签、事件处理器和 javascript: 伪协议 */
export function sanitizeHtml(html: string): string {
  return html
    // 移除 <script>...</script>
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // 移除 <style>...</style>
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // 移除 on* 事件处理器属性
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // 移除 javascript: 伪协议
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, 'href="#"')
    // 移除 iframe
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    // 移除 <object>/<embed>
    .replace(/<(?:object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, "")
}
