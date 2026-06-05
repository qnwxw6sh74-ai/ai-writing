import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://w.wyrunwu.com"

  const routes = [
    "",
    "/generate",
    "/hot-topics",
    "/pricing",
    "/about",
    "/title-generator",
    "/image-generator",
    "/originality-check",
    "/style-lab",
    "/tutorials",
    "/login",
    "/register",
    "/guestbook",
    "/changelog",
  ]

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: (route === "" || route === "/hot-topics") ? "hourly" as const : "weekly" as const,
    priority: route === "" ? 1 : route === "/generate" ? 0.9 : 0.7,
  }))
}
