import type { Metadata } from "next";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — BVI Sargassum Monitoring",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  if (!isAdminAuthenticated()) {
    return <AdminLogin />;
  }
  return <AdminDashboard />;
}
