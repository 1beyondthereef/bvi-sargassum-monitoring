"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, RefreshCw } from "lucide-react";
import { REPORT_STATUSES, severityBucket, type ReportStatus } from "@/lib/constants";
import type { SargassumReport } from "@/lib/types";

const AdminMap = dynamic(() => import("@/components/admin/AdminMap").then((m) => m.AdminMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center bg-ocean-50 text-sm text-ocean-700">
      Loading map…
    </div>
  ),
});

type SortKey = "date" | "severity" | "health";
type StatusFilter = "all" | ReportStatus;

const SEVERITY_DOT: Record<"low" | "mid" | "high", string> = {
  low: "bg-severity-low",
  mid: "bg-severity-mid",
  high: "bg-severity-high",
};

function mean(nums: number[]): string {
  if (nums.length === 0) return "—";
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
}

export function AdminDashboard() {
  const router = useRouter();

  const [reports, setReports] = useState<SargassumReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [minSeverity, setMinSeverity] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  // Sort + interaction
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [focus, setFocus] = useState<{ lng: number; lat: number; nonce: number } | null>(null);
  const [detail, setDetail] = useState<SargassumReport | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load reports.");
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Stats: exclude hidden unless toggled; 7-day window
  const stats = useMemo(() => {
    const base = reports.filter((r) => showHidden || r.status !== "hidden");
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7 = base.filter((r) => new Date(r.created_at).getTime() >= weekAgo);
    return {
      total: base.length,
      last7: last7.length,
      avgSeverity: mean(last7.map((r) => r.severity)),
      avgHealth: mean(last7.map((r) => r.health_impact)),
    };
  }, [reports, showHidden]);

  // Filtered + sorted list for map + table
  const visible = useMemo(() => {
    const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;

    const filtered = reports.filter((r) => {
      if (statusFilter !== "all") {
        if (r.status !== statusFilter) return false;
      } else if (!showHidden && r.status === "hidden") {
        return false;
      }
      const t = new Date(r.created_at).getTime();
      if (fromTime !== null && t < fromTime) return false;
      if (toTime !== null && t > toTime) return false;
      if (r.severity < minSeverity) return false;
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortKey === "severity") cmp = a.severity - b.severity;
      else cmp = a.health_impact - b.health_impact;
      return cmp * dir;
    });
  }, [reports, statusFilter, showHidden, from, to, minSeverity, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const changeStatus = async (id: string, status: ReportStatus) => {
    setUpdatingId(id);
    const prev = reports;
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    setDetail((d) => (d && d.id === id ? { ...d, status } : d));
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("update failed");
    } catch {
      setReports(prev); // revert
      alert("Could not update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  };

  const focusOn = (r: SargassumReport) =>
    setFocus({ lng: r.longitude, lat: r.latitude, nonce: Date.now() });

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", `${from}T00:00:00`);
    if (to) params.set("to", `${to}T23:59:59.999`);
    if (minSeverity > 0) params.set("min_severity", String(minSeverity));
    if (statusFilter !== "all") params.set("status", statusFilter);
    else if (showHidden) params.set("include_hidden", "true");
    window.location.href = `/api/admin/export?${params.toString()}`;
  };

  return (
    <main className="min-h-dvh bg-background">
      {/* Header */}
      <header className="flex items-center justify-between bg-ocean-800 px-5 py-4 text-white">
        <div>
          <h1 className="text-lg font-bold">Sargassum Reports — Admin</h1>
          <p className="text-xs text-ocean-100">BVI Sargassum Monitoring</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={loadReports}
            className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-ocean-700 px-3 py-2 text-sm font-medium hover:bg-ocean-600"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-ocean-700 px-3 py-2 text-sm font-medium hover:bg-ocean-600"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 p-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total reports" value={String(stats.total)} />
          <StatCard label="Last 7 days" value={String(stats.last7)} />
          <StatCard label="Avg severity (7d)" value={stats.avgSeverity} />
          <StatCard label="Avg health impact (7d)" value={stats.avgHealth} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ocean-200 bg-white p-4">
          <Field label="From">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </Field>
          <Field label="To">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </Field>
          <Field label="Min severity">
            <select
              value={minSeverity}
              onChange={(e) => setMinSeverity(Number(e.target.value))}
              className="input"
            >
              <option value={0}>Any</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="input"
            >
              <option value="all">All</option>
              {REPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm text-ocean-800">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
            />
            Show hidden
          </label>

          <div className="ml-auto pb-1">
            <button
              type="button"
              onClick={exportCsv}
              title="Download the filtered reports as CSV"
              className="rounded-lg bg-sargassum-500 px-4 py-2 text-sm font-semibold text-sargassum-950 shadow-sm transition-colors hover:bg-sargassum-400"
            >
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-severity-high">{error}</p>
        )}

        {/* Map */}
        <div className="overflow-hidden rounded-xl border border-ocean-200">
          <AdminMap reports={visible} onSelect={setDetail} focus={focus} />
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-ocean-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-ocean-700">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading reports…
            </div>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center text-ocean-600">
              {reports.length === 0
                ? "No reports have been submitted yet."
                : "No reports match these filters."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ocean-50 text-left text-ocean-800">
                <tr>
                  <Th onClick={() => toggleSort("date")} active={sortKey === "date"} dir={sortDir}>
                    Date
                  </Th>
                  <th className="px-3 py-2 font-semibold">Location</th>
                  <Th onClick={() => toggleSort("severity")} active={sortKey === "severity"} dir={sortDir}>
                    Severity
                  </Th>
                  <Th onClick={() => toggleSort("health")} active={sortKey === "health"} dir={sortDir}>
                    Health
                  </Th>
                  <th className="px-3 py-2 font-semibold">Comment</th>
                  <th className="px-3 py-2 font-semibold">Photos</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-ocean-100 hover:bg-ocean-50/50">
                    <td className="whitespace-nowrap px-3 py-2">
                      {new Date(r.created_at).toLocaleDateString()}{" "}
                      <span className="text-ocean-500">
                        {new Date(r.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => focusOn(r)}
                        className="font-mono text-xs text-ocean-700 underline decoration-dotted"
                        title="Center map here"
                      >
                        {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        <span className={`h-2.5 w-2.5 rounded-full ${SEVERITY_DOT[severityBucket(r.severity)]}`} />
                        {r.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2">{r.health_impact}</td>
                    <td className="max-w-[220px] truncate px-3 py-2 text-ocean-700">
                      {r.comments || <span className="text-ocean-400">—</span>}
                    </td>
                    <td className="px-3 py-2">{r.photo_urls.length}</td>
                    <td className="px-3 py-2">
                      <select
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(e) => changeStatus(r.id, e.target.value as ReportStatus)}
                        className="rounded border border-ocean-300 px-2 py-1 text-xs"
                      >
                        {REPORT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setDetail(r)}
                        className="rounded bg-ocean-600 px-2 py-1 text-xs font-medium text-white"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detail && (
        <DetailModal
          report={detail}
          onClose={() => setDetail(null)}
          onStatus={(s) => changeStatus(detail.id, s)}
          updating={updatingId === detail.id}
        />
      )}

      <style jsx>{`
        .input {
          border: 1px solid #b3dfeb;
          border-radius: 0.5rem;
          padding: 0.4rem 0.6rem;
          font-size: 0.875rem;
        }
      `}</style>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ocean-200 bg-white p-4">
      <div className="text-2xl font-bold text-ocean-900">{value}</div>
      <div className="text-xs text-ocean-600">{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ocean-700">
      {label}
      {children}
    </label>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th className="px-3 py-2 font-semibold">
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-ocean-600">
        {children}
        {active && <span>{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

function DetailModal({
  report,
  onClose,
  onStatus,
  updating,
}: {
  report: SargassumReport;
  onClose: () => void;
  onStatus: (s: ReportStatus) => void;
  updating: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <h2 className="text-lg font-bold text-ocean-900">Report detail</h2>
          <button onClick={onClose} className="text-ocean-500 hover:text-ocean-800">
            ✕
          </button>
        </div>

        <dl className="space-y-2 text-sm">
          <Row label="Submitted">{new Date(report.created_at).toLocaleString()}</Row>
          <Row label="Location">
            <span className="font-mono">
              {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
            </span>
          </Row>
          <Row label="Severity">{report.severity} / 10</Row>
          <Row label="Health impact">{report.health_impact} / 10</Row>
          <Row label="Comments">{report.comments || "—"}</Row>
          <Row label="Status">
            <select
              value={report.status}
              disabled={updating}
              onChange={(e) => onStatus(e.target.value as ReportStatus)}
              className="rounded border border-ocean-300 px-2 py-1 text-sm"
            >
              {REPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Row>
        </dl>

        {report.photo_urls.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {report.photo_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full rounded-lg object-cover" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 font-medium text-ocean-600">{label}</dt>
      <dd className="text-ocean-900">{children}</dd>
    </div>
  );
}
