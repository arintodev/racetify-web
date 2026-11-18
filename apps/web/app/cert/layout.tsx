import { SiteFooter } from "@/components/public-shell/site-footer"
import { SiteHeader } from "@/components/public-shell/site-header"

export default function CertificateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
