import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle2, Clock3, MessageSquareText, MonitorSmartphone, PhoneCall, Sparkles } from "lucide-react"

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

const workflow = [
  {
    title: "1. AI answers the call",
    description: "The assistant greets the customer by business name and captures the full order.",
  },
  {
    title: "2. Kitchen gets the ticket",
    description: "Orders land on the live display with items, modifiers, and customer details.",
  },
  {
    title: "3. Staff finishes the order",
    description: "Team members move the order from New to Making to Ready in one tap.",
  },
]

const proofPoints = [
  {
    label: "No missed calls",
    value: "24/7 coverage",
    icon: PhoneCall,
  },
  {
    label: "Kitchen visibility",
    value: "Live tickets",
    icon: MonitorSmartphone,
  },
  {
    label: "Faster prep",
    value: "Clear workflow",
    icon: Clock3,
  },
]

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.18),_transparent_35%),linear-gradient(180deg,#0b0b0c_0%,#090909_100%)] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-md">
          <div>
            <div className="text-lg font-semibold tracking-tight">OrderFlow AI</div>
            <div className="text-xs text-white/60">AI ordering for restaurants</div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#how-it-works" className="hover:text-white">How it works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </nav>
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

        <div className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="space-y-8">
            <Badge className="bg-white/10 text-white hover:bg-white/10">Built for deli, pizza, takeout, and multi-location operations</Badge>
            <div className="space-y-5 max-w-3xl">
              <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                A modern AI phone system that turns calls into kitchen tickets.
              </h1>
              <p className="text-lg leading-8 text-white/70 sm:text-xl">
                OrderFlow AI answers the phone, captures the full order, and routes it to a live kitchen display so your team can move faster with fewer missed calls and less chaos.
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

            <div className="grid gap-3 sm:grid-cols-3">
              {proofPoints.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <Icon className="h-5 w-5 text-red-400" />
                    <p className="mt-3 text-sm text-white/55">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold">{item.value}</p>
                  </div>
                )
              })}
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

            <Card className="border-white/10 bg-white/5 text-white" id="how-it-works">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <MessageSquareText className="h-4 w-4 text-red-400" />
                  How it works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/70">
                {workflow.map((step) => (
                  <div key={step.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="font-medium text-white">{step.title}</p>
                    <p className="mt-1 leading-6 text-white/65">{step.description}</p>
                  </div>
                ))}
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
            Start with the basics, then scale into more automation. One product for phone orders, kitchen operations, and analytics.
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

      <section id="contact" className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-10">
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="text-2xl">Ready to see it on your own menu?</CardTitle>
            <p className="text-white/65">Request a demo and we’ll show how OrderFlow AI handles calls, tickets, and your kitchen workflow end to end.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/login">
              <Button className="bg-[oklch(0.55_0.2_25)] text-white hover:bg-[oklch(0.5_0.2_25)]">
                Sign in
              </Button>
            </Link>
            <a href="mailto:hello@orderflowai.app?subject=Request%20a%20demo">
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                Request demo
              </Button>
            </a>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
