import Link from "next/link"
import { Phone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthFrame({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="theme-portal flex min-h-svh flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link href="/" className="flex flex-col items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Phone className="size-6" />
          </span>
          <span className="text-center">
            <span className="block text-xl font-semibold tracking-tight">OrderFlow AI</span>
            <span className="block text-xs text-muted-foreground">by ResurgeX Technologies</span>
          </span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-balance">{title}</CardTitle>
            {description && <CardDescription className="text-pretty">{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>

        {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  )
}
