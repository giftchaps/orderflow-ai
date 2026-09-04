"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Check, Play, Phone, ChefHat, MessageSquare, BarChart3, Clock, MapPin, Menu, X } from "lucide-react"
import { DemoRequestDialog } from "@/components/marketing/demo-request-dialog"

export default function OrderFlowLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [ctaEmail, setCtaEmail] = useState("")

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <span className="text-xl font-medium tracking-tight text-foreground">OrderFlow</span>

            <div className="hidden md:flex items-center gap-10">
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Demo</a>
            </div>

            <Button
              onClick={() => setDemoOpen(true)}
              className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6"
            >
              Book a demo
            </Button>

            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-t border-border px-6 py-6 space-y-4">
            <a href="#how-it-works" className="block text-foreground">How it works</a>
            <a href="#features" className="block text-foreground">Features</a>
            <a href="#demo" className="block text-foreground">Demo</a>
            <Button
              onClick={() => {
                setMobileMenuOpen(false)
                setDemoOpen(true)
              }}
              className="w-full bg-primary text-primary-foreground rounded-full mt-4"
            >
              Book a demo
            </Button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-8">
            Voice AI for restaurants
          </p>

          <h1 className="font-serif text-5xl sm:text-6xl lg:text-8xl leading-[1.1] tracking-tight mb-8 text-balance">
            The phone rings.
            <br />
            <span className="italic">You don&apos;t answer.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            OrderFlow answers every call, captures the order perfectly,
            and sends it to your kitchen — automatically. Finally, focus on the food.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => setDemoOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 h-14 text-base"
            >
              Request access
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="ghost" className="text-foreground hover:bg-muted rounded-full px-8 h-14 text-base group">
              <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Watch it work
            </Button>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16 px-6 lg:px-8 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20 text-center">
            <div>
              <div className="text-4xl font-serif text-foreground mb-1">200+</div>
              <p className="text-sm text-muted-foreground">restaurants live</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-border" />
            <div>
              <div className="text-4xl font-serif text-foreground mb-1">50,000</div>
              <p className="text-sm text-muted-foreground">orders this month</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-border" />
            <div>
              <div className="text-4xl font-serif text-foreground mb-1">8 sec</div>
              <p className="text-sm text-muted-foreground">avg. to kitchen</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="py-32 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.15em] text-accent mb-6">The problem</p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight mb-6 text-balance">
                Every ring is a choice: answer the phone or make the food.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                During rush hour, your best cook is also your phone operator.
                Orders get missed, details get lost, and customers wait longer.
                It&apos;s been this way forever — but it doesn&apos;t have to be.
              </p>
            </div>
            <div className="bg-muted rounded-2xl p-8 lg:p-12">
              <p className="text-sm uppercase tracking-[0.15em] text-accent mb-6">The solution</p>
              <h3 className="font-serif text-2xl sm:text-3xl leading-tight mb-6">
                AI that sounds human, captures everything, and never gets flustered.
              </h3>
              <ul className="space-y-4">
                {[
                  "Answers in your restaurant's voice",
                  "Understands complex modifications",
                  "Confirms before hanging up",
                  "Sends order to kitchen instantly",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="py-32 px-6 lg:px-8 bg-secondary">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.15em] text-accent mb-4">See it in action</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight text-balance">
              A real order, captured in real time.
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-card rounded-2xl border border-border p-8">
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-8">The call</p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-accent">AI</span>
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-5 py-4 text-sm">
                    {`"Good afternoon, Provenzano's Deli. What can I get started for you?"`}
                  </div>
                </div>

                <div className="flex gap-4 justify-end">
                  <div className="bg-foreground/5 rounded-2xl rounded-tr-sm px-5 py-4 text-sm text-muted-foreground max-w-[85%]">
                    {`"Yeah, let me get two Michelangelos — one on a 12 inch, no cherry peppers, extra provolone. And a chicken parm on a hard roll."`}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">C</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-accent">AI</span>
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-5 py-4 text-sm">
                    {`"Perfect — two Michelangelos, one 12 inch with no cherry peppers and extra provolone, and one chicken parm on a hard roll. That'll be about 15 minutes. See you soon!"`}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-accent">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  Order sent to kitchen in 6 seconds
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-8">
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-8">Kitchen ticket</p>

              <div className="mb-8">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-5xl font-serif text-foreground">#47</span>
                  <span className="text-xs uppercase tracking-wider text-accent bg-accent/10 px-3 py-1 rounded-full">New</span>
                </div>
                <p className="text-sm text-muted-foreground">Just now · (203) 555-0147</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-muted rounded-xl p-5">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-medium text-foreground">Michelangelo</span>
                    <span className="text-sm text-muted-foreground">×2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    12 inch · <span className="text-accent">no cherry peppers</span> · <span className="text-accent">extra provolone</span>
                  </p>
                </div>
                <div className="bg-muted rounded-xl p-5">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-medium text-foreground">Chicken Parm</span>
                    <span className="text-sm text-muted-foreground">×1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Hard roll</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl h-12">Accept</Button>
                <Button variant="outline" className="border-border rounded-xl h-12">Making</Button>
                <Button variant="outline" className="border-border rounded-xl h-12">Ready</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-32 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-sm uppercase tracking-[0.15em] text-accent mb-4">How it works</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight text-balance">
              Four steps. No hardware. No training.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { num: "1", title: "Answer", desc: "AI picks up, greets callers with your restaurant name. Natural, warm, never robotic." },
              { num: "2", title: "Capture", desc: "Takes down every item and modification. Reads it back. Confirms before ending." },
              { num: "3", title: "Execute", desc: "Structured ticket appears on your kitchen display instantly. Clear, organized, complete." },
              { num: "4", title: "Notify", desc: "Customer gets a text when it's ready. No callbacks, no confusion." },
            ].map((step, i) => (
              <div key={i} className="text-center lg:text-left">
                <div className="font-serif text-6xl text-muted-foreground/30 mb-4">{step.num}</div>
                <h3 className="text-xl font-medium text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6 lg:px-8 bg-secondary">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-sm uppercase tracking-[0.15em] text-accent mb-4">Everything included</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight text-balance">
              Built for busy kitchens.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Phone, title: "Voice AI", desc: "Handles your full menu — combos, mods, substitutions. No scripts, no hold music." },
              { icon: ChefHat, title: "Kitchen display", desc: "Orders appear in seconds. Tap to update: New → Making → Ready." },
              { icon: MessageSquare, title: "SMS notifications", desc: "Customers get a text when the order is received and when it's ready." },
              { icon: Clock, title: "Menu portal", desc: "Upload your menu. AI extracts items and prices. Go live in 30 minutes." },
              { icon: BarChart3, title: "Analytics", desc: "See busy hours, popular items, fulfillment times. Data that helps you run better." },
              { icon: MapPin, title: "Multi-location", desc: "Each location gets its own number, display, and menu. One dashboard." },
            ].map((feature, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-8 hover:border-accent/30 transition-colors">
                <feature.icon className="w-6 h-6 text-accent mb-5" strokeWidth={1.5} />
                <h3 className="text-lg font-medium text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-32 px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.15em] text-accent mb-4">Built for</p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight mb-16 text-balance">
            Restaurants where the phone never stops.
          </h2>

          <div className="grid sm:grid-cols-2 gap-6 text-left">
            {[
              { name: "Delis & sub shops", desc: "High volume, complex customizations, lunchtime chaos." },
              { name: "Pizza counters", desc: "Repeat orders, busy nights, hands covered in dough." },
              { name: "Bakeries", desc: "Custom orders, advance scheduling, zero room for error." },
              { name: "Multi-location operators", desc: "One system across every location, finally." },
            ].map((type, i) => (
              <div key={i} className="bg-muted rounded-2xl p-6">
                <h3 className="font-medium text-foreground mb-1">{type.name}</h3>
                <p className="text-sm text-muted-foreground">{type.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 lg:px-8 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight mb-6 text-balance">
            Ready to stop answering the phone?
          </h2>
          <p className="text-lg opacity-80 mb-10 max-w-xl mx-auto">
            We&apos;ll walk you through how OrderFlow handles your menu, your volume, and your workflow. Takes 20 minutes.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setDemoOpen(true)
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Input
              type="email"
              value={ctaEmail}
              onChange={(e) => setCtaEmail(e.target.value)}
              placeholder="Your email"
              className="h-14 px-6 rounded-full bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 w-full sm:w-80"
            />
            <Button
              type="submit"
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-full px-8 h-14 w-full sm:w-auto"
            >
              Request access
            </Button>
          </form>

          <p className="text-sm opacity-60">
            Already a customer?{" "}
            <a href="/login" className="underline hover:opacity-100">Sign in</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-8 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <span className="text-lg font-medium text-foreground">OrderFlow</span>
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-sm text-muted-foreground">© 2026</p>
        </div>
      </footer>

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} initialEmail={ctaEmail} />
    </div>
  )
}
