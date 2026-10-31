// Everything under /admin (the writer's side) uses a plain black & white theme for easy reading.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-theme">{children}</div>;
}
