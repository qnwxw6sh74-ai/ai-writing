import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "今日热点选题 — AI分析上升趋势 | 公众号爆文网",
  description: "聚合腾讯新闻、微博热搜、抖音热榜，AI智能分析上升期热点，为你提供公众号写作选题建议。每天更新，抓住流量风口。",
  keywords: "热点选题,热搜话题,公众号选题,写作灵感,今日热点,微博热搜,抖音热榜,腾讯新闻",
}

export default function HotTopicsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
