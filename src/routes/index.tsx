import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FeistyLogo } from "@/components/feisty/logo";
import {
  ArrowRight, Mail, MessageSquareText, ListTodo, Sparkles, BookOpen,
  Workflow, Shield, Zap, BarChart3, Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  { icon: Mail, title: "AI email drafting", desc: "Generate on-brand replies and follow-ups in seconds with adjustable tone and length." },
  { icon: MessageSquareText, title: "Meeting intelligence", desc: "Turn transcripts into summaries, decisions, and action items assigned to the right owner." },
  { icon: ListTodo, title: "Smart task planning", desc: "Break briefs into prioritized tasks with estimates and due dates, ready to execute." },
  { icon: Sparkles, title: "Research briefs", desc: "Generate structured research briefs with citations, sources, and key takeaways." },
  { icon: BookOpen, title: "Knowledge base", desc: "Upload documents and ask questions. Get answers grounded in your own files." },
  { icon: Workflow, title: "Workflow automation", desc: "Chain triggers and AI actions to automate the repetitive work you stopped enjoying." },
];

const tiers = [
  { name: "Starter", price: "Free", desc: "For individuals exploring AI productivity.", features: ["50 AI actions / month", "Email + Tasks + Notes", "Personal knowledge base"], cta: "Start free" },
  { name: "Pro", price: "$19", suffix: "/mo", desc: "For professionals who automate daily.", featured: true, features: ["Unlimited AI actions", "All AI tools", "Research with citations", "Workflow automation"], cta: "Try Pro" },
  { name: "Team", price: "$49", suffix: "/seat", desc: "For teams shipping work together.", features: ["Everything in Pro", "Shared workspaces", "Collaboration & roles", "Priority AI gateway"], cta: "Contact sales" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between">
          <FeistyLogo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
            <Button asChild size="sm" className="bg-indigo-500 hover:bg-indigo-400">
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-60"
             style={{ background: "radial-gradient(900px 500px at 50% -10%, rgba(99,102,241,0.25), transparent 60%), radial-gradient(700px 400px at 10% 30%, rgba(34,211,238,0.15), transparent 60%)" }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 text-xs text-muted-foreground mb-6">
            <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" /> Now in early access · Powered by Gemini
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] max-w-4xl mx-auto">
            Your AI workspace for{" "}
            <span className="text-gradient-brand">getting real work done</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Feisty Hub unifies email, meetings, tasks, research, and knowledge under one assistant.
            Automate the routine. Focus on what matters.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-indigo-500 hover:bg-indigo-400 shadow-glow">
              <Link to="/auth">Start free <ArrowRight className="ml-1 size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">See features</a>
            </Button>
          </div>
          {/* Mock dashboard preview */}
          <div className="mt-16 mx-auto max-w-5xl rounded-2xl border border-border bg-card/50 backdrop-blur p-2 shadow-2xl shadow-indigo-500/10">
            <div className="rounded-xl bg-background border border-border overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
                <div className="size-2.5 rounded-full bg-red-500/60" />
                <div className="size-2.5 rounded-full bg-yellow-500/60" />
                <div className="size-2.5 rounded-full bg-green-500/60" />
              </div>
              <div className="grid grid-cols-3 gap-3 p-4 text-left">
                {[
                  { label: "Inbox drafts", value: "12", trend: "+4 today" },
                  { label: "Meetings summarized", value: "37", trend: "this week" },
                  { label: "Tasks completed", value: "184", trend: "↑ 23% MoM" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border p-4">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="text-2xl font-semibold mt-1">{s.value}</div>
                    <div className="text-xs text-cyan-400 mt-1">{s.trend}</div>
                  </div>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3 px-4 pb-4 text-left">
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Sparkles className="size-3.5" /> Daily briefing
                  </div>
                  <p className="text-sm text-foreground/90">You have 3 meetings today. Priority: ship the Q3 roadmap draft before the 2pm sync.</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <ListTodo className="size-3.5" /> Top tasks
                  </div>
                  <ul className="text-sm space-y-1.5">
                    <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-indigo-400" /> Review pricing experiment</li>
                    <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-cyan-400" /> Draft launch email</li>
                    <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-purple-400" /> Sync with design team</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">One workspace. Every productivity ritual.</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Replace a stack of disconnected apps with a single AI-powered command center.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card/50 p-6 hover:border-indigo-500/40 transition">
              <div className="size-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 grid place-items-center mb-4">
                <f.icon className="size-5 text-indigo-300" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-3 gap-10">
          {[
            { n: "01", t: "Bring it in", d: "Connect your work or upload your docs. Feisty Hub builds a private knowledge base for you." },
            { n: "02", t: "Let AI lift the routine", d: "Drafts, summaries, plans, research briefs — generated in seconds with full control." },
            { n: "03", t: "Stay in flow", d: "Track outcomes with analytics, automate repeat work, and focus on the thinking only you can do." },
          ].map((s) => (
            <div key={s.n}>
              <div className="text-xs font-mono text-cyan-400 mb-2">{s.n}</div>
              <h3 className="text-xl font-semibold">{s.t}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats / trust */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {[
          { k: "12hrs", v: "saved per week", icon: Zap },
          { k: "98%", v: "draft acceptance rate", icon: BarChart3 },
          { k: "SOC2", v: "ready architecture", icon: Shield },
          { k: "<2s", v: "average AI response", icon: Sparkles },
        ].map((s) => (
          <div key={s.v} className="rounded-xl border border-border p-6">
            <s.icon className="size-5 mx-auto text-cyan-400 mb-2" />
            <div className="text-2xl font-bold">{s.k}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple pricing for serious work</h2>
          <p className="mt-3 text-muted-foreground">Start free. Upgrade when AI becomes your most valuable teammate.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {tiers.map((t) => (
            <div key={t.name}
                 className={`rounded-2xl border p-6 ${t.featured ? "border-indigo-500/60 bg-gradient-to-b from-indigo-500/10 to-transparent shadow-glow" : "border-border bg-card/50"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{t.name}</h3>
                {t.featured && <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-semibold">Most popular</span>}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{t.price}</span>
                {t.suffix && <span className="text-muted-foreground text-sm">{t.suffix}</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-2">{t.desc}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="size-4 text-cyan-400" />{f}</li>
                ))}
              </ul>
              <Button asChild className={`w-full mt-6 ${t.featured ? "bg-indigo-500 hover:bg-indigo-400" : ""}`} variant={t.featured ? "default" : "outline"}>
                <Link to="/auth">{t.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-indigo-500/15 via-card to-cyan-400/10 p-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to focus on what matters?</h2>
          <p className="mt-3 text-muted-foreground">Join professionals automating their routine with Feisty Hub.</p>
          <Button asChild size="lg" className="mt-6 bg-indigo-500 hover:bg-indigo-400">
            <Link to="/auth">Get started free <ArrowRight className="ml-1 size-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-muted-foreground">
          <FeistyLogo />
          <p>© {new Date().getFullYear()} Feisty Hub. Automate the routine. Focus on what matters.</p>
        </div>
      </footer>
    </div>
  );
}
