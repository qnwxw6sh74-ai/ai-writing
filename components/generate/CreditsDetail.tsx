"use client"

import { X, Zap, CreditCard, FileText, Type, Image } from "lucide-react"

interface CreditsInfo {
  isLoggedIn: boolean
  paymentEnabled: boolean
  total: number
  freeUsed: number
  freeRemaining: number
  purchasedUsed: number
  purchasedRemaining: number
  remaining: number
  purchasedCredits: number
  freeQuotaUsed: number
  freeQuotaTotal: number
  freeQuotaByAction?: Record<string, number>
}

interface Props {
  open: boolean
  onClose: () => void
  credits: CreditsInfo | null
}

const actionLabels: Record<string, { label: string; icon: typeof FileText }> = {
  generate: { label: "文章生成", icon: FileText },
  title: { label: "标题生成", icon: Type },
  image: { label: "图片生成", icon: Image },
  assemble: { label: "大纲组装", icon: FileText },
  confirm: { label: "文章确认", icon: FileText },
}

export function CreditsDetail({ open, onClose, credits }: Props) {
  if (!open || !credits) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Zap size={18} className="text-yellow-400" />
            额度明细
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 免费额度 */}
          <div>
            <h4 className="text-xs text-zinc-500 font-medium mb-2">免费额度（按IP, 90天滚动）</h4>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-300">总剩余</span>
                <span className="text-sm font-bold text-zinc-100">
                  {credits.freeRemaining} / {credits.total}
                </span>
              </div>
              {/* 按 action 分组明细 */}
              <div className="space-y-1.5">
                {Object.entries(credits.freeQuotaByAction || {}).map(([action, used]) => {
                  const info = actionLabels[action]
                  if (!info) return null
                  const Icon = info.icon
                  const total = credits.freeQuotaTotal || credits.total
                  const remaining = Math.max(0, total - used)
                  return (
                    <div key={action} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 flex items-center gap-1.5">
                        <Icon size={12} />
                        {info.label}
                      </span>
                      <span className={remaining > 0 ? "text-zinc-400" : "text-red-400"}>
                        已用 {used}/{total}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 付费额度 */}
          <div>
            <h4 className="text-xs text-zinc-500 font-medium mb-2">付费额度（永久有效）</h4>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              {credits.isLoggedIn ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">已购买</span>
                    <span className="text-sm font-bold text-zinc-100">{credits.purchasedCredits} 次</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">已使用</span>
                    <span className="text-sm text-zinc-400">{credits.purchasedUsed} 次</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700">
                    <span className="text-sm text-zinc-300">剩余</span>
                    <span className={`text-sm font-bold ${credits.purchasedRemaining > 0 ? "text-green-400" : "text-red-400"}`}>
                      {credits.purchasedRemaining} 次
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <CreditCard size={20} className="text-zinc-600 mx-auto mb-1" />
                  <p className="text-xs text-zinc-500">登录后可查看付费额度</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>总剩余 {credits.remaining} 次</span>
          {!credits.isLoggedIn && credits.remaining <= 0 && (
            <span className="text-red-400">请登录后购买套餐</span>
          )}
        </div>
      </div>
    </div>
  )
}
