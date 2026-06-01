"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, Flame } from "lucide-react"

interface NavLink { label: string; href: string }

const defaultNavLinks: NavLink[] = [
  { label: "首页", href: "/" },
  { label: "爆文题目生成", href: "/title-generator" },
  { label: "爆文生成", href: "/generate" },
  { label: "图片生成", href: "/image-generator" },
  { label: "原创检测", href: "/originality-check" },
  { label: "使用教程", href: "/tutorials" },
  { label: "留言板", href: "/guestbook" },
  { label: "更新日志", href: "/changelog" },
  { label: "关于我们", href: "/about" },
]

interface Props {
  siteName?: string
  navLinks?: NavLink[]
  enablePayment?: boolean
}

export function Header({ siteName = "公众号爆文生成器", navLinks = defaultNavLinks, enablePayment = false }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-zinc-100 hover:text-red-500 transition-colors">
            <Flame size={22} className="text-red-500" />
            {siteName}
          </Link>

          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link key={link.href + link.label} href={link.href} className="text-sm text-zinc-400 hover:text-red-400 px-2 py-1 rounded transition-colors">
                {link.label}
              </Link>
            ))}
            {enablePayment && (
              <Link href="/pricing" className="text-sm text-red-400 hover:text-red-300 px-2 py-1 rounded transition-colors font-medium">
                💰 定价
              </Link>
            )}
          </div>

          <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-zinc-400 hover:text-red-400 transition-colors" aria-label="Toggle menu">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {mobileOpen && (
          <div className="lg:hidden border-t border-zinc-800 py-3 pb-4">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link key={link.href + link.label} href={link.href} onClick={() => setMobileOpen(false)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800/50 px-3 py-2 rounded transition-colors">
                  {link.label}
                </Link>
              ))}
              {enablePayment && (
                <Link href="/pricing" onClick={() => setMobileOpen(false)} className="text-red-400 hover:text-red-300 hover:bg-zinc-800/50 px-3 py-2 rounded transition-colors font-medium">
                  💰 定价
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
