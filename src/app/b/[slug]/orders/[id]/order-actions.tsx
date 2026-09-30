"use client";

import { useState } from "react";
import { formatPeso, centavosToInput } from "@/src/lib/money";
import { PAYMENT_METHODS, FULFILLMENT_STATUSES } from "@/src/lib/order-options";
import { recordPayment, confirmOrder, updateFulfillment, completeOrder, cancelOrder } from "../actions";

type Result = { ok: true } | { ok: false; error: string };

export function OrderActions({
  slug, orderId, status, fulfillmentStatus, balance, amountPaid, canManage, canCancel,
}: {
  slug: string; orderId: string; status: string; fulfillmentStatus: string;
  balance: number; amountPaid: number; canManage: boolean; canCancel: boolean;
}) {
  const [payment, setPayment] = useState({ amount: centavosToInput(balance), method: "CASH", reference: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isOpen = status === "PENDING" || status === "CONFIRMED";
  const isCancelled = status === "CANCELLED";

  async function run(action: () => Promise<Result>) {
    setError("");
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) setError(result.error);
    return result.ok;
  }

  async function handlePayment() {
    const ok = await run(() => recordPayment(slug, orderId, payment));
    if (ok) setPayment({ amount: "", method: payment.method, reference: "" });
  }

  function handleCancel() {
    const warning = amountPaid > 0
      ? `Cancel this order? Stock will be returned. ${formatPeso(amountPaid)} was already paid, so remember to refund the customer.`
      : "Cancel this order? Stock will be returned to inventory.";
    if (confirm(warning)) run(() => cancelOrder(slug, orderId));
  }

  if (!canManage && !canCancel) return null;

  const input = "w-full rounded border p-2 text-sm";

  return (
    <div className="space-y-4">
      {canManage && !isCancelled && balance > 0 && (
        <div className="space-y-2 rounded-lg border p-4">
          <p className="text-sm font-semibold">Record payment</p>
          <input inputMode="decimal" className={input} placeholder="Amount (₱)" value={payment.amount}
            onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
          <select className={input} value={payment.method}
            onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <input className={input} placeholder="Reference no. (optional)" value={payment.reference}
            onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
          <button onClick={handlePayment} disabled={busy}
            className="w-full rounded bg-black p-2 text-sm text-white disabled:opacity-50">
            Save payment
          </button>
        </div>
      )}

      {canManage && !isCancelled && (
        <div className="rounded-lg border p-4">
          <label className="mb-1 block text-sm font-semibold">Fulfillment status</label>
          <select className={input} value={fulfillmentStatus} disabled={busy}
            onChange={(e) => run(() => updateFulfillment(slug, orderId, e.target.value))}>
            {FULFILLMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      {isOpen && (
        <div className="space-y-2">
          {canManage && status === "PENDING" && (
            <button onClick={() => run(() => confirmOrder(slug, orderId))} disabled={busy}
              className="w-full rounded border p-2 text-sm disabled:opacity-50">
              Confirm order
            </button>
          )}
          {canManage && (
            <button onClick={() => run(() => completeOrder(slug, orderId))} disabled={busy || balance > 0}
              className="w-full rounded bg-green-700 p-2 text-sm text-white disabled:opacity-50">
              Complete order
            </button>
          )}
          {canManage && balance > 0 && (
            <p className="text-xs text-gray-500">Record the full payment to complete this order.</p>
          )}
          {canCancel && (
            <button onClick={handleCancel} disabled={busy}
              className="w-full rounded border p-2 text-sm text-red-600 disabled:opacity-50">
              Cancel order
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}