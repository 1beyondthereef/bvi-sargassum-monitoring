"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Login failed.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-ocean-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2 text-ocean-800">
          <Lock className="h-5 w-5" />
          <h1 className="text-lg font-bold">Admin sign in</h1>
        </div>
        <p className="mb-4 text-sm text-ocean-600">
          Enter the department password to view sargassum reports.
        </p>

        <label htmlFor="password" className="mb-1 block text-sm font-medium text-ocean-800">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="w-full rounded-lg border border-ocean-300 p-3 text-base focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-200"
        />

        {error && <p className="mt-2 text-sm text-severity-high">{error}</p>}

        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-ocean-700 px-4 py-3 text-base font-semibold text-white hover:bg-ocean-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
        </button>
      </form>
    </main>
  );
}
