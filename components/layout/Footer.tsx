import Link from "next/link"

interface FooterLink { label: string; href: string }

const defaultLinks: FooterLink[] = [
  { label: "关于我们", href: "/about" },
  { label: "使用教程", href: "/tutorials" },
  { label: "更新日志", href: "/changelog" },
  { label: "留言板", href: "/guestbook" },
]

interface Props {
  email?: string
  copyright?: string
  links?: FooterLink[]
}

export function Footer({ email = "contact@你的域名.com", copyright = "公众号爆文生成器 | 本站使用AI大模型驱动，所有内容仅供参考。", links = defaultLinks }: Props) {
  return (
    <footer className="w-full border-t border-zinc-800 bg-zinc-950 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex justify-center space-x-6 mb-4">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-zinc-500 hover:text-red-400 transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
        <p className="mb-2 text-sm text-zinc-500">
          📧 联系邮箱：{" "}
          <a href={`mailto:${email}`} className="hover:text-red-400 transition-colors">
            {email}
          </a>
        </p>
        <p className="text-xs text-zinc-600">© {new Date().getFullYear()} {copyright}</p>
      </div>
    </footer>
  )
}
