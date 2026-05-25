"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Globe,
  Search,
  Mail,
  TrendingUp,
  LogOut,
  RefreshCw,
  ExternalLink,
  Zap,
  Users,
} from "lucide-react";
import { leadsApi, authApi } from "@/lib/api";

interface Stats {
  total_leads: number;
  pages_generated: number;
  emails_sent: number;
  conversions: number;
}

interface Lead {
  id: string;
  business_name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  review_count: number | null;
  status: string;
  preview_url: string | null;
  created_at: string;
}

interface ScrapeJob {
  id: string;
  status: string;
  leads_found: number;
}

const STATUS_COLORS: Record<string, string> = {
  discovered: "bg-gray-100 text-gray-700",
  page_generated: "bg-blue-100 text-blue-700",
  email_sent: "bg-purple-100 text-purple-700",
  opened: "bg-yellow-100 text-yellow-700",
  converted: "bg-green-100 text-green-700",
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapeQuery, setScrapeQuery] = useState("");
  const [scrapeLocation, setScrapeLocation] = useState("");
  const [scraping, setScraping] = useState(false);
  const [activeJob, setActiveJob] = useState<ScrapeJob | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [meRes, statsRes, leadsRes] = await Promise.all([
        authApi.me(),
        leadsApi.stats(),
        leadsApi.list(),
      ]);
      setUser(meRes.data);
      setStats(statsRes.data);
      setLeads(leadsRes.data);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [fetchData, router]);

  useEffect(() => {
    if (!activeJob || activeJob.status === "completed" || activeJob.status === "failed") return;

    const interval = setInterval(async () => {
      const res = await leadsApi.getScrapeJob(activeJob.id);
      const job = res.data as ScrapeJob;
      setActiveJob(job);
      if (job.status === "completed" || job.status === "failed") {
        clearInterval(interval);
        setScraping(false);
        if (job.status === "completed") {
          toast.success(`Found ${job.leads_found} leads without websites!`);
          fetchData();
        } else {
          toast.error("Scrape job failed");
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJob, fetchData]);

  const handleScrape = async () => {
    if (!scrapeQuery || !scrapeLocation) {
      toast.error("Enter both a business type and location");
      return;
    }
    setScraping(true);
    try {
      const res = await leadsApi.startScrape(scrapeQuery, scrapeLocation);
      setActiveJob(res.data);
      toast("Scraping Google Maps...", { icon: "🔍" });
    } catch {
      toast.error("Failed to start scrape");
      setScraping(false);
    }
  };

  const handleGeneratePage = async (leadId: string) => {
    setGeneratingIds((s) => new Set(s).add(leadId));
    try {
      await leadsApi.generatePage(leadId);
      toast.success("Landing page generated!");
      fetchData();
    } catch {
      toast.error("Failed to generate page");
    } finally {
      setGeneratingIds((s) => {
        const n = new Set(s);
        n.delete(leadId);
        return n;
      });
    }
  };

  const handleSendEmail = async (leadId: string) => {
    setSendingIds((s) => new Set(s).add(leadId));
    try {
      await leadsApi.sendEmail(leadId);
      toast.success("Preview email sent!");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send email");
    } finally {
      setSendingIds((s) => {
        const n = new Set(s);
        n.delete(leadId);
        return n;
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-dark text-white flex flex-col p-6 z-40">
        <div className="flex items-center gap-2 font-bold text-lg mb-10">
          <Globe className="text-brand" size={20} />
          GetWeb
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { icon: TrendingUp, label: "Dashboard", active: true },
            { icon: Users, label: "Leads" },
            { icon: Search, label: "Scrape" },
          ].map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 pt-4">
          <div className="text-xs text-white/50 mb-1 truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-dark">Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">
                Welcome back{user?.full_name ? `, ${user.full_name}` : ""}
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-dark transition-colors"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Leads", value: stats.total_leads, icon: Users, color: "text-blue-500" },
                { label: "Pages Generated", value: stats.pages_generated, icon: Zap, color: "text-purple-500" },
                { label: "Emails Sent", value: stats.emails_sent, icon: Mail, color: "text-yellow-500" },
                { label: "Conversions", value: stats.conversions, icon: TrendingUp, color: "text-green-500" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className={`${color} mb-3`}>
                    <Icon size={20} />
                  </div>
                  <div className="text-2xl font-bold text-dark">{value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Scrape */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
            <h2 className="font-semibold text-dark mb-4 flex items-center gap-2">
              <Search size={16} className="text-brand" /> Find New Leads
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Business type (e.g. plumber, roofer)"
                value={scrapeQuery}
                onChange={(e) => setScrapeQuery(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <input
                type="text"
                placeholder="City, State (e.g. Austin, TX)"
                value={scrapeLocation}
                onChange={(e) => setScrapeLocation(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <button
                onClick={handleScrape}
                disabled={scraping}
                className="bg-brand hover:bg-brand-dark text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {scraping ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search size={14} /> Scan
                  </>
                )}
              </button>
            </div>
            {activeJob && (
              <div className="mt-3 text-xs text-gray-500">
                Job status: <span className="font-medium">{activeJob.status}</span>
                {activeJob.status === "completed" && ` · ${activeJob.leads_found} leads found`}
              </div>
            )}
          </div>

          {/* Leads table */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-dark">Leads</h2>
              <span className="text-xs text-gray-400">{leads.length} total</span>
            </div>

            {leads.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <Search size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No leads yet. Run a scan to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {leads.map((lead) => (
                  <div key={lead.id} className="p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-dark text-sm truncate">
                        {lead.business_name}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {lead.category} · {lead.address}
                      </div>
                      {lead.rating && (
                        <div className="text-xs text-gray-400">
                          ★ {lead.rating} ({lead.review_count} reviews)
                        </div>
                      )}
                    </div>

                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {lead.status.replace("_", " ")}
                    </span>

                    <div className="flex items-center gap-2">
                      {lead.status === "discovered" && (
                        <button
                          onClick={() => handleGeneratePage(lead.id)}
                          disabled={generatingIds.has(lead.id)}
                          className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60 flex items-center gap-1"
                        >
                          {generatingIds.has(lead.id) ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                          ) : (
                            <Zap size={12} />
                          )}
                          Generate Page
                        </button>
                      )}

                      {lead.status === "page_generated" && lead.email && (
                        <button
                          onClick={() => handleSendEmail(lead.id)}
                          disabled={sendingIds.has(lead.id)}
                          className="text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60 flex items-center gap-1"
                        >
                          {sendingIds.has(lead.id) ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600" />
                          ) : (
                            <Mail size={12} />
                          )}
                          Send Email
                        </button>
                      )}

                      {lead.preview_url && (
                        <a
                          href={lead.preview_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-400 hover:text-dark transition-colors"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
