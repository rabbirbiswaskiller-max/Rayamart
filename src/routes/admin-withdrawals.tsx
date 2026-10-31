import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { taka } from "@/lib/catalog";
import { listWithdrawals, reviewWithdrawal, type WithdrawalRow } from "@/lib/partner-dashboard";

export const Route = createFileRoute("/admin-withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals — Raya Mart admin" }] }),
  loader: async () => ({ rows: await listWithdrawals() }),
  component: AdminWithdrawals,
});

const statusText: Record<WithdrawalRow["status"], string> = {
  requested: "অপেক্ষায়",
  paid: "পাঠানো হয়েছে",
  rejected: "বাতিল",
};

function AdminWithdrawals() {
  const { rows } = Route.useLoaderData();
  const pendingCount = rows.filter((r) => r.status === "requested").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Admin</p>
      <h1 className="mt-2 font-serif text-4xl">টাকা তোলার অনুরোধ</h1>
      <p className="mt-2 text-sm text-ink-soft">{pendingCount} টি অনুরোধ অপেক্ষায় আছে।</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-mute">এখনো কোনো অনুরোধ নেই।</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
              <tr>
                <th className="py-3 pr-4">Partner</th>
                <th className="py-3 pr-4">পরিমাণ</th>
                <th className="py-3 pr-4">bKash নম্বর</th>
                <th className="py-3 pr-4">অবস্থা</th>
                <th className="py-3">পাঠানোর পর</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <WithdrawalRowView key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WithdrawalRowView({ row }: { row: WithdrawalRow }) {
  const router = useRouter();
  const [trx, setTrx] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function review(action: "paid" | "reject") {
    setErr("");
    setBusy(true);
    try {
      await reviewWithdrawal({ data: { id: row.id, action, trx } });
      await router.invalidate();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "সংরক্ষণ করা যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-b border-line align-top">
      <td className="py-3 pr-4 font-mono text-xs">{row.ref}</td>
      <td className="py-3 pr-4 tabular-nums">{taka(row.amount)}</td>
      <td className="py-3 pr-4 font-mono text-xs">{row.number}</td>
      <td className="py-3 pr-4">{statusText[row.status]}</td>
      <td className="py-3">
        {row.status === "requested" ? (
          <div className="flex flex-wrap gap-2">
            <input
              value={trx}
              onChange={(e) => setTrx(e.target.value)}
              placeholder="bKash TrxID"
              className="h-8 w-36 border border-line px-2 text-xs"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => review("paid")}
              className="border border-ink px-3 py-1 text-xs disabled:opacity-40"
            >
              পাঠানো হয়েছে
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => review("reject")}
              className="border border-line px-3 py-1 text-xs text-brick disabled:opacity-40"
            >
              বাতিল
            </button>
            {err ? <p className="w-full text-xs text-brick">{err}</p> : null}
          </div>
        ) : (
          <span className="font-mono text-xs">{row.trx ?? "—"}</span>
        )}
      </td>
    </tr>
  );
}
