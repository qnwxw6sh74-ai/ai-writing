import { Suspense } from "react"

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>
}
