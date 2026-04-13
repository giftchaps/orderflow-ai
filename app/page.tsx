import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle2, MessageSquareText, MonitorSmartphone, PhoneCall, Sparkles } from "lucide-react"

const plans = [
  {
    name: "Starter",
    price: "$49/mo",
    description: "For small shops getting started with AI ordering.",
    features: ["AI phone intake", "Kitchen display", "Email support"],
  },
  {
    name: "Growth",
    price: "$99/mo",
    description: "For growing restaurants that need more volume.",
    features: ["Everything in Starter", "SMS confirmations", "Menu editing"],
    featured: true,
  },
  {
    name: "Pro",
    price: "$149/mo",
    description: "For high-volume businesses and multi-location operations.",
    features: ["Everything in Growth", "Priority onboarding", "Analytics"],
  },
]

const highlights = [
  "Voice AI answers calls and takes complete orders",
  "Orders appear instantly on the kitchen display",
  "Staff can accept, prepare, and finish orders",
  "Built for multi-location food businesses",
]

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.18),_transparent_35%),linear-gradient(180deg,#0b0b0c_0%,#090909_100%)] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold tracking-tight">OrderFlow AI</div>
            <div className="text-xs text-white/60">AI ordering for restaurants</div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                Sign in
              </Button>
            </Link>
            <a href="mailto:hello@orderflowai.app?subject=Request%20a%20demo">
              <Button className="bg-[oklch(0.55_0.2_25)] text-white hover:bg-[oklch(0.5_0.2_25)]">
                Request demo
              </Button>
            </a>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="space-y-8">
            <Badge className="bg-white/10 text-white hover:bg-white/10">Built for deli, pizza, and takeout operations</Badge>
            <div className="space-y-5 max-w-3xl">
              <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
                Let AI answer the phone and push orders straight to the kitchen.
              </h1>
              <p className="text-lg leading-8 text-white/70 sm:text-xl">
                OrderFlow AI takes phone orders, confirms customizations, and sends them to a live kitchen display so your team can move faster with fewer missed calls.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg" className="bg-[oklch(0.55_0.2_25)] text-white hover:bg-[oklch(0.5_0.2_25)]">
                  Open app
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="mailto:hello@orderflowai.app?subject=Request%20a%20demo">
                <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  Request a demo
                </Button>
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-400" />
                  <span className="text-sm leading-6 text-white/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-white/10 bg-white/5 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/70">
                    <PhoneCall className="h-4 w-4 text-red-400" />
                    AI Phone Intake
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">24/7</p>
                  <p className="mt-1 text-sm text-white/60">Answer every call without missing orders.</p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/70">
                    <MonitorSmartphone className="h-4 w-4 text-red-400" />
                    Kitchen Display
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">Live</p>
                  <p className="mt-1 text-sm text-white/60">Orders route straight to the line.</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <MessageSquareText className="h-4 w-4 text-red-400" />
                  What the system does
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/70">
                <p>• Answers calls with your business name</p>
                <p>• Captures items, modifiers, and special instructions</p>
                <p>• Sends the order to the kitchen board</p>
                <p>• Supports admin, business, and staff portals</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-7xl px-6 pb-20 lg:px-10">
        <div className="mb-8 max-w-2xl space-y-3">
          <Badge className="bg-white/10 text-white hover:bg-white/10">Pricing</Badge>
          <h2 className="text-3xl font-semibold tracking-tight">Simple packages built for food businesses.</h2>
          <p className="text-white/65">
            Start small, grow into more automation, and keep one product for phone orders, kitchen operations, and analytics.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`border-white/10 ${plan.featured ? "bg-white/10 ring-1 ring-red-400/40" : "bg-white/5"} text-white`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl text-white">
                  {plan.name}
                  {plan.featured ? <Badge className="bg-red-500 text-white hover:bg-red-500">Popular</Badge> : null}
                </CardTitle>
                <p className="text-3xl font-semibold">{plan.price}</p>
                <p className="text-sm text-white/60">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/70">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-red-400" />
                    <span>{feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
