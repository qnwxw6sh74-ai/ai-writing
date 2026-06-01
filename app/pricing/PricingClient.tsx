"use client"

import { useState } from "react"
import { Check, QrCode, Wallet2 } from "lucide-react"

interface PricingPlan {
  id: number
  name: string
  price: number
  credits: number
  description: string
  is_active: number
  sort_order: number
}

export function PricingClient({ plans }: { plans: PricingPlan[] }) {
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null)
  const [payType, setPayType] = useState<number>(0)
  const [orderResult, setOrderResult] = useState<{ orderId?: string; payUrl?: string; qrcodeUrl?: string; message?: string } | null>(null)
  const [isPaying, setIsPaying] = useState(false)

  const handlePay = async (plan: PricingPlan, type: 1 | 2) => {
    setIsPaying(true)
    setSelectedPlan(plan)
    setPayType(type)
    setOrderResult(null)

    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: plan.price, type, planId: plan.id }),
      })
      const data = await res.json()
      setOrderResult(data)

      // 如果有支付链接，新窗口打开
      if (data.payUrl) {
        window.open(data.payUrl, "_blank")
      }
    } catch {
      setOrderResult({ message: "支付服务暂不可用，请稍后重试" })
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">💰 选择套餐</h1>
          <p className="text-zinc-400 mt-2">解锁无限AI创作能力，让爆文创作更轻松</p>
        </div>

        {plans.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg">暂无可选套餐，请联系管理员</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <div
              key={plan.id}
              className={`relative bg-zinc-900 rounded-xl border p-6 flex flex-col ${
                idx === 1
                  ? "border-red-800 ring-1 ring-red-900/50 shadow-lg shadow-red-900/10"
                  : "border-zinc-800 hover:border-red-900/50"
              }`}
            >
              {idx === 1 && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  推荐
                </span>
              )}
              <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
              <div className="mb-3">
                <span className="text-3xl font-extrabold text-red-400">¥{plan.price}</span>
                <span className="text-zinc-500 text-sm"> / {plan.credits}次</span>
              </div>
              <p className="text-sm text-zinc-400 mb-4 flex-1">{plan.description}</p>
              <ul className="space-y-2 mb-5 text-sm">
                <li className="flex items-center gap-2 text-zinc-300">
                  <Check size={16} className="text-red-400 shrink-0" />
                  {plan.credits} 次AI生成额度
                </li>
                <li className="flex items-center gap-2 text-zinc-300">
                  <Check size={16} className="text-red-400 shrink-0" />
                  支持文章+标题生成
                </li>
                <li className="flex items-center gap-2 text-zinc-300">
                  <Check size={16} className="text-red-400 shrink-0" />
                  额度永久有效
                </li>
              </ul>

              <div className="space-y-2">
                <button
                  onClick={() => handlePay(plan, 1)}
                  disabled={isPaying}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2.5 rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 text-sm"
                >
                  <QrCode size={16} /> 微信支付
                </button>
                <button
                  onClick={() => handlePay(plan, 2)}
                  disabled={isPaying}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 text-sm"
                >
                  <Wallet2 size={16} /> 支付宝
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 支付结果提示 */}
        {orderResult && (
          <div className={`mt-6 p-4 rounded-lg text-center text-sm ${orderResult.orderId ? "bg-red-950/30 border border-red-900/30 text-red-300" : "bg-yellow-950/30 border border-yellow-900/30 text-yellow-300"}`}>
            {orderResult.orderId ? (
              <>
                <p className="font-bold mb-1">订单已创建</p>
                <p className="text-zinc-400">订单号：{orderResult.orderId}</p>
                {orderResult.qrcodeUrl && (
                  <img src={orderResult.qrcodeUrl} alt="支付二维码" className="mx-auto mt-3 rounded-lg max-w-[200px]" />
                )}
                <p className="text-zinc-500 mt-2">请在新打开的窗口中完成支付</p>
              </>
            ) : (
              <p>{orderResult.message || "支付失败"}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
