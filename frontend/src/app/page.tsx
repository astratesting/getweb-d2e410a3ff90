"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, Search, Mail, ArrowRight, CheckCircle, Star, Zap } from "lucide-react";

const STATS = [
  { label: "US businesses without websites", value: "10M+" },
  { label: "Revenue lost annually", value: "$300B" },
  { label: "Avg. pages generated / hour", value: "500+" },
];

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: "We scan Google Maps",
    description:
      "Our scraper finds local businesses in your target area that have no website listed.",
  },
  {
    icon: Zap,
    title: "AI generates a landing page",
    description:
      "Claude builds a tailored, professional landing page for each business — in seconds.",
  },
  {
    icon: Mail,
    title: "We email the owner",
    description:
      "Each owner receives a personal email with a free preview link. You get notified when they open it.",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    features: ["25 leads / month", "5 AI pages / month", "Email previews", "Basic analytics"],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$49",
    per: "/mo",
    features: ["500 leads / month", "100 AI pages / month", "Auto email campaigns", "CRM export"],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$149",
    per: "/mo",
    features: [
      "Unlimited leads",
      "Unlimited AI pages",
      "White-label emails",
      "Priority support",
      "API access",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-dark">
            <Globe className="text-brand" size={22} />
            GetWeb
          </div>
          <div className="flex items-center gap-4">
            <Link href="#pricing" className="text-sm text-gray-600 hover:text-dark">
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-dark"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="bg-brand text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-dark via-dark-mid to-dark-light text-white py-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-8">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            10 million US businesses still have no website
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Turn offline businesses into{" "}
            <span className="text-brand">paying customers</span>
          </h1>
          <p className="text-xl text-white/75 max-w-2xl mx-auto mb-10">
            GetWeb scrapes Google Maps, generates a stunning AI website for each business, and
            emails the owner a free preview — automatically. You close the deal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 rounded-lg text-dark w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <Link
              href={`/register${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Start for Free <ArrowRight size={16} />
            </Link>
          </div>
          <p className="mt-4 text-white/50 text-sm">No credit card required</p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-bold text-dark mb-1">{s.value}</div>
              <div className="text-gray-500 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-dark mb-4">How it works</h2>
          <p className="text-gray-500 text-center mb-16 max-w-xl mx-auto">
            Three automated steps take you from zero to warm leads — without any manual work.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="relative">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center mb-4">
                  <step.icon className="text-brand" size={22} />
                </div>
                <div className="absolute top-4 left-12 text-xs font-bold text-brand/30 ml-2">
                  0{i + 1}
                </div>
                <h3 className="font-semibold text-lg text-dark mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-dark mb-4">Simple pricing</h2>
          <p className="text-gray-500 text-center mb-16">
            Start free. Scale when you're ready.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border ${
                  plan.highlight
                    ? "bg-dark text-white border-dark shadow-xl scale-105"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="text-sm font-semibold mb-2 opacity-70">{plan.name}</div>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.per && (
                    <span className="opacity-60 text-sm mb-1">{plan.per}</span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle
                        size={16}
                        className={plan.highlight ? "text-brand" : "text-brand"}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-3 rounded-lg font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? "bg-brand hover:bg-brand-dark text-white"
                      : "bg-dark/5 hover:bg-dark/10 text-dark"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-brand">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Start finding leads today</h2>
          <p className="text-white/80 mb-8">
            Join agencies and freelancers closing more web design deals with GetWeb.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-brand font-bold px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors text-lg"
          >
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2 font-bold text-dark">
            <Globe className="text-brand" size={16} />
            GetWeb
          </div>
          <div>© 2025 GetWeb. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-dark">Privacy</Link>
            <Link href="/terms" className="hover:text-dark">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
