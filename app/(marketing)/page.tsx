import Link from "next/link"
import { PhoneCall, CheckCircle2, ChevronRight } from "lucide-react"
import { DemoRequestForm } from "@/components/marketing/demo-request-form"

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#080808]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600">
              <PhoneCall className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">OrderFlow AI</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-white/60 lg:flex">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#operators" className="hover:text-white transition-colors">For operators</a>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          </nav>

          <a href="#demo">
            <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
              Book a demo
            </button>
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative border-b border-white/8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.15),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 text-center lg:px-10 lg:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Live at Provenzano&apos;s Deli, West Haven CT
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Your phone answers itself.{" "}
            <span className="text-red-500">Your kitchen gets the order.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60 sm:text-xl">
            OrderFlow AI picks up every inbound call, captures the full order including all customizations, and sends a live ticket to your kitchen display — in under 10 seconds. No missed calls, no wrong orders, no staff pulled off the line.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href="#demo-flow">
              <button className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                See it live
              </button>
            </a>
            <a href="#demo">
              <button className="rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                Book a walkthrough
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-b border-white/8 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <div className="grid grid-cols-1 gap-px bg-white/8 sm:grid-cols-3">
            {[
              { value: "24/7", label: "Calls answered without a human" },
              { value: "< 10 sec", label: "From call end to kitchen display" },
              { value: "Zero", label: "Extra staff required" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#080808] px-8 py-10 text-center sm:text-left">
                <p className="text-4xl font-bold text-white">{stat.value}</p>
                <p className="mt-2 text-sm text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Demo Flow ── */}
      <section id="demo-flow" className="border-b border-white/8">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-3">Real order. Real result.</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From call to kitchen in one flow.</h2>
            <p className="mt-4 text-base text-white/55">This is an actual order taken at Provenzano&apos;s Deli. No editing, no demo mode.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Conversation */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">The call</p>

              <div className="flex gap-3">
                <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-600/20 text-xs font-bold text-red-400">AI</div>
                <div className="rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3 text-sm leading-6 text-white/80">
                  &ldquo;Thank you for calling Provenzano&apos;s Deli, what can I get for you today?&rdquo;
                </div>
              </div>

              <div className="flex gap-3 flex-row-reverse">
                <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">C</div>
                <div className="rounded-2xl rounded-tr-sm bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white/70">
                  &ldquo;Two Michelangelos, one on a 12 inch, no cherry peppers, extra provolone. And a chicken parm on a hard roll.&rdquo;
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-600/20 text-xs font-bold text-red-400">AI</div>
                <div className="rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3 text-sm leading-6 text-white/80">
                  &ldquo;Got it — two Michelangelos on a 12 inch, no cherry peppers, extra provolone. One chicken parm on a hard roll. Your order number is 47. We&apos;ll have it ready in about 15 minutes. Thanks!&rdquo;
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/8 px-4 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-green-300">Order confirmed and sent to kitchen in 8 seconds</span>
              </div>
            </div>

            {/* Kitchen ticket */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Kitchen display ticket</p>
              <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <div>
                    <span className="text-xs text-white/40">Order</span>
                    <p className="text-2xl font-bold">#47</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-semibold text-yellow-400">New</span>
                    <p className="mt-1 text-xs text-white/40">Just now · (203) 555-0147</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-sm font-semibold">Michelangelo ×2</p>
                    <p className="text-xs text-white/50 mt-1">12 inch sub &nbsp;·&nbsp; <span className="text-red-400">− cherry peppers</span> &nbsp;·&nbsp; <span className="text-green-400">+ extra provolone</span></p>
                  </div>
                  <div className="rounded-lg border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-sm font-semibold">Chicken Parm ×1</p>
                    <p className="text-xs text-white/50 mt-1">Hard roll</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  {["Accept", "Making", "Ready"].map((action, i) => (
                    <button key={action} className={`rounded-lg py-2 text-xs font-semibold transition-colors ${i === 0 ? "bg-red-600 text-white" : "border border-white/10 text-white/40"}`}>
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="border-b border-white/8 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-3">How it works</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Four steps. No new hardware. No training.</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Answer",
                body: "The AI picks up and greets the caller by your business name. Sounds natural, not robotic.",
              },
              {
                step: "02",
                title: "Capture",
                body: "Takes down every item, bread choice, modification, and special request. Confirms the full order back to the customer before ending the call.",
              },
              {
                step: "03",
                title: "Execute",
                body: "A clean structured order ticket appears on your kitchen display instantly. Staff see the order number, items, and every modification clearly.",
              },
              {
                step: "04",
                title: "Notify",
                body: "The customer gets an automatic SMS confirming their order. When staff mark it done, the customer gets another SMS that it's ready for pickup.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-4xl font-bold text-white/10">{item.step}</p>
                <p className="mt-4 text-lg font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/55">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-b border-white/8">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-3">What's included</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need. Nothing you don't.</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Voice AI call intake",
                body: "Handles your full menu including combos, modifiers, and substitutions in natural conversation. No scripts, no keypad menus, no hold music.",
              },
              {
                title: "Live kitchen display",
                body: "Orders appear on screen in under 10 seconds. Staff work a New, Making, Ready board — one tap to update each order's status.",
              },
              {
                title: "Customer SMS notifications",
                body: "Automatic text when the order is received and another when it's ready for pickup. Reduces the callback calls.",
              },
              {
                title: "Menu management portal",
                body: "Upload a photo of your menu. The AI extracts every item, price, and modifier automatically. Review, edit, and go live in under 30 minutes.",
              },
              {
                title: "Order history and analytics",
                body: "Full searchable record of every order. See your busiest hours, most ordered items, and average fulfillment time.",
              },
              {
                title: "Multi-location support",
                body: "Each location gets its own phone number, kitchen display, and menu. All managed from one operator account.",
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                  <div>
                    <p className="font-semibold">{feature.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/55">{feature.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who It's For ── */}
      <section id="operators" className="border-b border-white/8 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-3">For operators</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for restaurants where the phone never stops.</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                title: "Delis and sub shops",
                body: "High modifier volume, complex customizations, and a lunch rush that overwhelms the counter. This is exactly the business we built for first.",
              },
              {
                title: "Pizza and takeout counters",
                body: "Custom orders, repeat customers, and a team that cannot be answering phones while making food.",
              },
              {
                title: "Bakeries and specialty shops",
                body: "Custom orders placed in advance with specific details that cannot be written down wrong. AI captures and stores everything.",
              },
              {
                title: "Growing operators",
                body: "Running more than one location and tired of each one having a different broken system for phone orders.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <ChevronRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1.5 text-sm leading-6 text-white/55">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo / CTA ── */}
      <section id="demo" className="border-b border-white/8 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-red-500">Book a walkthrough</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Bring your menu and your rush hour.</h2>
              <p className="text-base leading-7 text-white/55">
                We'll walk you through how OrderFlow AI handles your specific menu, your order volume, and your team's workflow. Takes 20 minutes. No commitment.
              </p>
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                {[
                  "We review your restaurant type, current order volume, and workflow.",
                  "We show how voice AI, kitchen display, and the business portal fit together.",
                  "We map the right rollout path for one location or multiple businesses.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-red-500" />
                    <p className="text-sm leading-6 text-white/60">{item}</p>
                  </div>
                ))}
              </div>
              <Link href="/login" className="inline-block">
                <button className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors">
                  Existing customer sign in
                </button>
              </Link>
            </div>
            <DemoRequestForm />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600">
              <PhoneCall className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">OrderFlow AI</span>
            <span className="text-sm text-white/30">· Built by ResurgeX Technologies · © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="mailto:hello@resurgex.ai" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>

    </main>
  )
}
