import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pdf.wyrunwu.com"

  const routes = [
    { path: "", freq: "hourly" as const, priority: 1 },
    { path: "/generate", freq: "weekly" as const, priority: 0.95 },
    { path: "/title-generator", freq: "weekly" as const, priority: 0.85 },
    { path: "/image-generator", freq: "weekly" as const, priority: 0.8 },
    { path: "/pricing", freq: "weekly" as const, priority: 0.7 },
    { path: "/tutorials", freq: "weekly" as const, priority: 0.7 },
    { path: "/style-lab", freq: "weekly" as const, priority: 0.6 },
    { path: "/originality-check", freq: "weekly" as const, priority: 0.6 },
    { path: "/hot-topics", freq: "hourly" as const, priority: 0.9 },
    { path: "/about", freq: "monthly" as const, priority: 0.5 },
    { path: "/guestbook", freq: "weekly" as const, priority: 0.4 },
    { path: "/changelog", freq: "weekly" as const, priority: 0.3 },
  ]

  return routes.map(({ path, freq, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: freq,
    priority,
  }))
}
