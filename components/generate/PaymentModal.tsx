"use client"

import { useState, useEffect, useRef } from "react"
import { X, QrCode, Loader2, Check, Sparkles } from "lucide-react"
import { getUserErrorMessage } from "@/lib/fetch-utils"

interface Plan {
  id: number; name: string; price: number; credits: number; description: string; is_trial: number
}

interface Props {
  open: boolean
  onClose: () => void
  onPaid: () => void
}

const POLL_INTERVAL = 3000
const POLL_MAX = 30

export function PaymentModal({ open, onClose, onPaid }: Props) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<number | null>(null) // 正在支付的 plan id
  const [polling, setPolling] = useState(false)
  const [result, setResult] = useState<{ paid?: boolean; message?: string; creditsAdded?: number } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (open) {
      setLoading(true)
      setResult(null)
      fetch("/api/plans")
        .then(r => r.json())
        .then(d => setPlans(d.plans || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [open])

  const handlePay = async (plan: Plan) => {
    console.log("[PaymentModal] handlePay 触发:", { id: plan.id, name: plan.name, price: plan.price, is_trial: plan.is_trial })
    setPaying(plan.id)
    setResult(null)

    // 先同步打开空白窗口（避免浏览器拦截异步 window.open）
    const payWindow = window.open("about:blank", "_blank")
    console.log("[PaymentModal] window.open 结果:", payWindow ? "窗口已打开" : "被拦截")

    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: plan.price, type: 1, planId: plan.id }),
      })
      const data = await res.json()

      if (!res.ok || data.success === false) {
        setResult({ message: data.error || data.message || "创建订单失败，请稍后重试" })
        if (payWindow && !payWindow.closed) payWindow.close()
        return
      }

      if (data.payPageUrl) {
        if (payWindow && !payWindow.closed) {
          payWindow.location.href = data.payPageUrl
        } else {
          setResult({ message: `支付页面被浏览器拦截，请手动打开：${data.payPageUrl}` })
        }
      } else {
        // 无支付页面，关闭空白窗口并提示
        if (payWindow && !payWindow.closed) payWindow.close()
        setResult({ message: data.message || "创建支付订单失败，请稍后重试" })
      }
      if (data.payId) startPoll(data.payId, data.orderId || data.payId)
    } catch (e) {
      setResult({ message: getUserErrorMessage(e, "支付服务异常，请稍后重试") })
      if (payWindow && !payWindow.closed) payWindow.close()
    } finally {
      setPaying(null)
    }
  }

  const startPoll = (payId: string, orderId: string) => {
    setPolling(true)
    let count = 0
    pollRef.current = setInterval(async () => {
      count++
      try {
        const res = await fetch(`/api/payment/check?payId=${payId}&orderId=${orderId}`)
        const data = await res.json()
        if (data.paid) {
          if (pollRef.current) clearInterval(pollRef.current)
          setPolling(false)
          setResult({ paid: true, creditsAdded: data.creditsAdded, message: "支付成功！额度已到账" })
          setTimeout(() => { onPaid(); onClose() }, 2000)
        }
        if (count >= POLL_MAX) {
          if (pollRef.current) clearInterval(pollRef.current)
          setPolling(false)
          setResult({ message: "等待超时，如已付款请稍后刷新页面" })
        }
      } catch { /* 继续重试 */ }
    }, POLL_INTERVAL)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* 弹窗 */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-red-400" /> 购买额度
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">选择套餐，微信扫码支付</p>
          </div>
          <button type="button" onClick={onClose} title="关闭" className="p-1 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 结果提示 */}
        {result && (
          <div className={`mx-5 mt-4 p-3 rounded-lg text-sm text-center ${
            result.paid ? "bg-green-950/30 border border-green-900/30 text-green-300" : "bg-red-950/30 border border-red-900/30 text-red-300"
          }`}>
            {result.paid ? (
              <><Check size={16} className="inline mr-1" />{result.message}</>
            ) : (
              result.message
            )}
          </div>
        )}

        {/* 套餐列表 */}
        <div className="p-5 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-zinc-500">
              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
              加载套餐...
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">暂无可用套餐</div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-zinc-800/50 border rounded-xl p-4 flex items-center justify-between ${
                  plan.is_trial ? "border-yellow-700/50" : "border-zinc-700"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{plan.name}</span>
                    {plan.is_trial === 1 && (
                      <span className="text-[10px] bg-yellow-600 text-white px-1.5 py-0.5 rounded-full">限首次</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">{plan.description}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    <span className="text-red-400 font-bold text-base">¥{plan.price}</span> / {plan.credits}次
                  </div>
                </div>
                <button
                  onClick={() => handlePay(plan)}
                  disabled={paying !== null || polling}
                  className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 disabled:opacity-50 text-sm font-bold shrink-0 transition-colors"
                >
                  {paying === plan.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <QrCode size={14} />
                  )}
                  支付
                </button>
              </div>
            ))
          )}

          {polling && (
            <div className="text-center text-xs text-zinc-500 flex items-center justify-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              等待支付中... 支付后自动到账
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
