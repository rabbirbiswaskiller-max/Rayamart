import { Link } from "@tanstack/react-router";

const links = [
  { to: "/admin-dashboard", label: "Dashboard" },
  { to: "/admin-orders", label: "Orders" },
  { to: "/manage-store", label: "Products" },
  { to: "/admin-pricing", label: "Pricing" },
  { to: "/admin-customers", label: "Customers" },
  { to: "/admin-partners", label: "Partners" },
  { to: "/admin-withdrawals", label: "Withdrawals" },
  { to: "/admin-payments", label: "Payments" },
  { to: "/admin-reports", label: "Reports" },
] as const;

export function AdminNav() {
  return (
    <nav aria-label="Admin" className="mt-6 flex flex-wrap gap-2 text-xs print:hidden">
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="border border-line bg-white px-3 py-2 hover:border-ink">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
