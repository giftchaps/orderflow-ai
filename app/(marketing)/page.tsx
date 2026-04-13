import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Headset,
  LayoutDashboard,
  MessageSquareMore,
  MonitorSmartphone,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Store,
  TimerReset,
  Users,
  Workflow,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoRequestForm } from "@/components/marketing/demo-request-form"

const outcomes = [
  {
    label: "Calls answered",
    value: "24/7",
    detail: "AI covers the rush, after-hours, and every missed ring in between.",
    icon: Headset,
  },
  {
    label: "Ops visibility",
    value: "One live board",
    detail: "Phone orders, modifiers, and prep state stay in a single workflow.",
    icon: MonitorSmartphone,
  },
  {
    label: "Staff leverage",
    value: "Fewer interruptions",
    detail: "Your front line spends less time repeating orders and more time producing them.",
    icon: Users,
  },
]

const featureColumns = [
  {
    eyebrow: "Front of house",
    title: "The phone finally stops being a bottleneck.",
    body:
      "OrderFlow AI answers with your business name, handles menu questions, captures modifiers, and confirms the full order in a consistent tone every time.",
    bullets: [
      "Voice-first AI call intake",
      "Clear capture of sandwiches, combos, breads, notes, and add-ons",
      "Fewer missed calls during lunch and dinner rush",
    ],
    icon: PhoneCall,
  },
  {
    eyebrow: "Kitchen flow",
    title: "Every order becomes an actionable ticket.",
    body:
      "The kitchen display receives structured orders instantly so staff can accept, make, and complete tickets without digging through transcripts or sticky notes.",
    bullets: [
      "New, Making, Ready workflow",
      "Customer phone and order timer visible at a glance",
      "Designed for deli, takeout, and fast-casual teams",
    ],
    icon: ClipboardList,
  },
  {
    eyebrow: "Business control",
    title: "Operators get a real portal, not just a call bot.",
    body:
      "Menus, onboarding, staff accounts, analytics, and display links live inside one operating system so you can roll this out business by business.",
    bullets: [
      "Business and admin portal structure",
      "Staff invite flow and role-based access",
      "Multi-tenant foundation for scale",
    ],
    icon: LayoutDashboard,
  },
]

const journey = [
  {
    title: "Answer",
    description: "The AI agent picks up, greets the customer, and steers the conversation without scripts feeling robotic.",
    icon: Bot,
  },
  {
    title: "Structure",
    description: "Orders are transformed into clean tickets with items, breads, notes, and customer phone details.",
    icon: Workflow,
  },
  {
    title: "Execute",
    description: "The kitchen runs the board, updates status, and keeps service moving without repeating call details.",
    icon: TimerReset,
  },
  {
    title: "Follow through",
    description: "The system is built to support confirmations, ready notifications, analytics, and business ops from the same platform.",
    icon: BellRing,
  },
]

const capabilities = [
  "AI voice intake for food orders",
  "Live kitchen display by business",
  "Business portal for menu, staff, and settings",
  "Admin onboarding for multi-tenant rollout",
  "Supabase-backed order storage and role management",
  "Built for delis, pizza shops, takeout counters, and fast-moving kitchens",
]

const audiences = [
  {
    title: "Independent delis",
    copy: "Capture rush-hour calls without pulling someone off the line.",
    icon: Store,
  },
  {
    title: "Takeout-heavy restaurants",
    copy: "Standardize incoming orders and reduce mistakes on custom items.",
    icon: MessageSquareMore,
  },
  {
    title: "Growing operators",
    copy: "Roll out the same workflow across multiple businesses from one platform.",
    icon: BarChart3,
  },
]

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#050505_0%,#090909_36%,#120808_100%)] text-white">
      <section className="relative isolate overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(225,29,72,0.25),transparent_35%),radial-gradient(circle_at_78%_18%,rgba(245,158,11,0.18),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_38%)]" />
        <div className="absolute left-1/2 top-24 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(220,38,38,0.18),transparent_62%)] blur-3xl" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,oklch(0.62_0.22_25),oklch(0.52_0.2_20))] shadow-[0_12px_40px_rgba(220,38,38,0.28)]">
                <PhoneCall className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">OrderFlow AI</div>
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">ResurgeX Technologies</div>
              </div>
            </div>

            <nav className="hidden items-center gap-6 text-sm text-white/70 lg:flex">
              <a href="#platform" className="transition hover:text-white">
                Platform
              </a>
              <a href="#workflow" className="transition hover:text-white">
                Workflow
              </a>
              <a href="#operators" className="transition hover:text-white">
                Operators
              </a>
              <a href="#demo" className="transition hover:text-white">
                Demo
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                  Sign in
                </Button>
              </Link>
              <a href="#demo">
                <Button className="bg-[oklch(0.58_0.22_25)] text-white hover:bg-[oklch(0.53_0.22_25)]">
                  Book a demo
                </Button>
              </a>
            </div>
          </header>

          <div className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
            <div className="max-w-3xl space-y-8">
              <Badge className="w-fit border border-white/10 bg-white/8 px-4 py-1.5 text-white hover:bg-white/8">
                Voice AI for food ordering, kitchen execution, and operator control
              </Badge>

              <div className="space-y-6">
                <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                  Build the restaurant phone system your staff actually wants.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
                  OrderFlow AI answers calls, captures full food orders, pushes structured tickets to a kitchen display, and gives operators one place to manage the workflow behind the rush.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a href="#demo">
                  <Button size="lg" className="bg-[oklch(0.58_0.22_25)] px-6 text-white hover:bg-[oklch(0.53_0.22_25)]">
                    See the live workflow
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/15 bg-white/6 px-6 text-white hover:bg-white/10 hover:text-white"
                  >
                    Open the app
                  </Button>
                </Link>
              </div>

              <div className="grid gap-4 pt-4 sm:grid-cols-3">
                {outcomes.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.label}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur"
                    >
                      <Icon className="h-5 w-5 text-[oklch(0.72_0.18_80)]" />
                      <p className="mt-5 text-sm uppercase tracking-[0.22em] text-white/45">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
                      <p className="mt-2 text-sm leading-6 text-white/62">{item.detail}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-8 top-12 hidden h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.26),transparent_65%)] blur-2xl lg:block" />
              <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                <div className="rounded-[1.6rem] border border-white/10 bg-[#080808]/90 p-5">
                  <div className="flex items-center justify-between border-b border-white/8 pb-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-white/45">Live system view</p>
                      <h2 className="mt-1 text-2xl font-semibold">Call to kitchen in one operating flow</h2>
                    </div>
                    <Badge className="border border-emerald-400/30 bg-emerald-400/12 text-emerald-200 hover:bg-emerald-400/12">
                      System online
                    </Badge>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <div className="rounded-3xl border border-white/8 bg-[linear-gradient(135deg,rgba(220,38,38,0.18),rgba(255,255,255,0.04))] p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Voice intake</p>
                          <p className="mt-1 text-xl font-semibold">AI answers the call in your brand voice</p>
                        </div>
                        <div className="rounded-2xl bg-white/8 p-3">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-white/42">Customer says</p>
                          <p className="mt-2 text-sm leading-6 text-white/78">
                            &quot;Two Michelangelos, one on 12 inch sub, one on a hard roll, no cherry peppers, extra provolone.&quot;
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-white/42">System captures</p>
                          <p className="mt-2 text-sm leading-6 text-white/78">
                            item, quantity, bread, modifiers, customer phone, and order timing
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-white/42">Kitchen display</p>
                            <p className="mt-1 text-lg font-semibold">Staff sees a usable ticket, not a transcript</p>
                          </div>
                          <MonitorSmartphone className="h-5 w-5 text-[oklch(0.72_0.18_80)]" />
                        </div>
                        <div className="mt-4 space-y-3">
                          {[
                            { status: "New", accent: "bg-[oklch(0.8_0.16_85)]/20 text-[oklch(0.8_0.16_85)]", body: "Order #47 queued with modifiers and timer" },
                            { status: "Making", accent: "bg-[oklch(0.65_0.22_25)]/20 text-[oklch(0.65_0.22_25)]", body: "Accepted by staff and moved into prep" },
                            { status: "Ready", accent: "bg-[oklch(0.65_0.18_145)]/20 text-[oklch(0.65_0.18_145)]", body: "Ready state supports pickup follow-through" },
                          ].map((lane) => (
                            <div key={lane.status} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                              <div className="flex items-center justify-between">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${lane.accent}`}>{lane.status}</span>
                                <ChevronRight className="h-4 w-4 text-white/30" />
                              </div>
                              <p className="mt-3 text-sm text-white/72">{lane.body}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/42">Operator control</p>
                        <p className="mt-1 text-lg font-semibold">Designed as a system, not a one-off AI demo</p>
                        <div className="mt-4 grid gap-3">
                          {[
                            { icon: ShieldCheck, title: "Role-based portal", text: "Separate admin and business flows for onboarding, staff, and settings." },
                            { icon: Workflow, title: "One multi-tenant foundation", text: "Each business gets its own menu, display, analytics, and operating context." },
                            { icon: Sparkles, title: "Built for expansion", text: "The architecture is already pointed toward SMS, analytics, and multi-location rollout." },
                          ].map((item) => {
                            const Icon = item.icon
                            return (
                              <div key={item.title} className="flex gap-3 rounded-2xl border border-white/8 bg-black/25 p-4">
                                <div className="mt-0.5 rounded-2xl bg-white/8 p-2">
                                  <Icon className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium text-white">{item.title}</p>
                                  <p className="mt-1 text-sm leading-6 text-white/62">{item.text}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge className="w-fit border border-white/10 bg-white/6 text-white hover:bg-white/6">
              Product architecture
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              A cleaner operating model for phone-driven food businesses.
            </h2>
            <p className="text-base leading-7 text-white/62 sm:text-lg">
              OrderFlow AI is not just a chatbot on a phone line. It is a connected system across call intake, kitchen execution, staff access, and business-level visibility.
            </p>
          </div>

          <div className="max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-white/62">
            Best fit for delis, pizza counters, takeout concepts, and owner-operators who lose revenue when the phone becomes a distraction instead of a channel.
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {featureColumns.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.title} className="border-white/10 bg-white/[0.035] text-white">
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(220,38,38,0.22),rgba(245,158,11,0.16))]">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/42">{item.eyebrow}</p>
                    <CardTitle className="mt-2 text-2xl leading-tight">{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="leading-7 text-white/62">{item.body}</p>
                  <div className="space-y-3">
                    {item.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-[oklch(0.72_0.18_80)]" />
                        <span className="text-sm leading-6 text-white/72">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section id="workflow" className="border-y border-white/8 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
          <div className="mb-10 max-w-3xl space-y-3">
            <Badge className="w-fit border border-white/10 bg-white/6 text-white hover:bg-white/6">
              End-to-end workflow
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              The system is designed around what actually happens during service.
            </h2>
            <p className="text-base leading-7 text-white/62 sm:text-lg">
              When calls spike, the right answer is not more chaos at the counter. It is a structured path from customer intent to kitchen action.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-4">
            {journey.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="relative rounded-3xl border border-white/10 bg-black/30 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs uppercase tracking-[0.24em] text-white/35">0{index + 1}</span>
                  </div>
                  <p className="mt-6 text-xl font-semibold">{step.title}</p>
                  <p className="mt-3 text-sm leading-7 text-white/62">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="operators" className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <Badge className="w-fit border border-white/10 bg-white/6 text-white hover:bg-white/6">
              Who this is for
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for operators who need calls handled without adding more staff friction.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-white/62 sm:text-lg">
              The product is especially strong when menus have lots of modifiers, rush windows are intense, and the same team juggling prep also has to answer the phone.
            </p>

            <div className="grid gap-4">
              {audiences.map((audience) => {
                const Icon = audience.icon
                return (
                  <div key={audience.title} className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{audience.title}</p>
                      <p className="mt-1 text-sm leading-6 text-white/62">{audience.copy}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-white/40">Core capabilities</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {capabilities.map((capability) => (
                <div key={capability} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-white/10 p-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.72_0.18_80)]" />
                    </div>
                    <p className="text-sm leading-6 text-white/74">{capability}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-white/8 bg-black/25 p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-white/40">Messaging angle</p>
              <p className="mt-3 text-xl font-semibold">
                The homepage should sell calm operations, fewer missed orders, and a cleaner rollout path for real restaurants.
              </p>
              <p className="mt-3 text-sm leading-7 text-white/62">
                That is the framing this redesign leans into: not generic AI hype, but a sharper picture of how the system helps a busy food business answer calls, structure work, and operate with more control.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-10">
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.28)] lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-5">
              <Badge className="w-fit border border-white/10 bg-white/6 text-white hover:bg-white/6">
                Book a walkthrough
              </Badge>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Bring your menu, your rush-hour pain points, and your current workflow.
                </h2>
                <p className="text-base leading-7 text-white/62 sm:text-lg">
                  We will walk you through how OrderFlow AI handles call intake, kitchen tickets, staff flow, and rollout for your business.
                </p>
              </div>

              <div className="space-y-3 rounded-3xl border border-white/8 bg-black/25 p-5">
                <p className="text-sm uppercase tracking-[0.22em] text-white/40">What happens next</p>
                {[
                  "We review your restaurant type, current order volume, and workflow.",
                  "We show how voice AI, kitchen display, and the business portal fit together.",
                  "We map the right rollout path for one location or multiple businesses.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <ChevronRight className="mt-1 h-4 w-4 text-[oklch(0.72_0.18_80)]" />
                    <p className="text-sm leading-6 text-white/70">{item}</p>
                  </div>
                ))}
              </div>

              <Link href="/login">
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/6 text-white hover:bg-white/10 hover:text-white"
                >
                  Existing customer sign in
                </Button>
              </Link>
            </div>

            <DemoRequestForm />
          </div>
        </div>
      </section>
    </main>
  )
}
