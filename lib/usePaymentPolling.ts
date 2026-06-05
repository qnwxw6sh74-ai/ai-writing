"use client"

import { useRef, useCallback, useState } from "react"

const POLL_INTERVAL = 3000
const POLL_MAX = 30

interface PollResult {
  paid: boolean
  creditsAdded?: number
  message: string
}

/**
 * 支付轮询 hook — 复用 PaymentModal 和 PricingClient 的查询逻辑
 * @param onPaid 支付成功后回调（如刷新额度显示）
 */
export function usePaymentPolling(onPaid?: () => void) {
  const [polling, setPolling] = useState(false)
  const [result, setResult] = useState<PollResult | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startPoll = useCallback((payId: string, orderId: string) => {
    setPolling(true)
    setResult(null)
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
          onPaid?.()
          return
        }
        if (count >= POLL_MAX) {
          if (pollRef.current) clearInterval(pollRef.current)
          setPolling(false)
          setResult({ paid: false, message: "等待超时，如已付款请稍后刷新页面" })
        }
      } catch { /* 继续重试 */ }
    }, POLL_INTERVAL)
  }, [onPaid])

  const stopPoll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    setPolling(false)
  }, [])

  return { polling, result, startPoll, stopPoll, setResult }
}
