"use client";

import { useState } from "react";
import { formatPeso, centavosToInput } from "@/src/lib/money";
import { PAYMENT_METHODS, FULFILLMENT_STATUSES } from "@/src/lib/order-options";
import { recordPayment, confirmOrder, updateFulfillment, completeOrder, cancelOrder } from "../actions";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/src/components/ui/native-select";
import { Notice } from "@/src/components/form-field";
import { ConfirmDialog } from "@/src/components/confirm-dialog";

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

  const cancelWarning = amountPaid > 0
    ? `Cancel this order? Stock will be returned. ${formatPeso(amountPaid)} was already paid, so remember to refund the customer.`
    : "Cancel this order? Stock will be returned to inventory.";

  if (!canManage && !canCancel) return null;

  return (
    <div className="space-y-6">
      {canManage && !isCancelled && balance > 0 && (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-base">Record payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input inputMode="decimal" aria-label="Amount" placeholder="Amount (₱)" value={payment.amount}
              onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
            <NativeSelect aria-label="Payment method" value={payment.method}
              onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => <NativeSelectOption key={m.value} value={m.value}>{m.label}</NativeSelectOption>)}
            </NativeSelect>
            <Input aria-label="Reference number" placeholder="Reference no. (optional)" value={payment.reference}
              onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
            <Button onClick={handlePayment} disabled={busy} className="w-full">
              Save payment
            </Button>
          </CardContent>
        </Card>
      )}

      {canManage && !isCancelled && (
        <Card className="gap-4">
          <CardContent className="space-y-1.5">
            <Label htmlFor="fulfillmentStatus" className="text-base font-semibold text-gray-900">Fulfillment status</Label>
            <NativeSelect id="fulfillmentStatus" value={fulfillmentStatus} disabled={busy}
              onChange={(e) => run(() => updateFulfillment(slug, orderId, e.target.value))}>
              {FULFILLMENT_STATUSES.map((s) => <NativeSelectOption key={s.value} value={s.value}>{s.label}</NativeSelectOption>)}
            </NativeSelect>
          </CardContent>
        </Card>
      )}

      {isOpen && (
        <div className="space-y-3">
          {canManage && status === "PENDING" && (
            <Button variant="secondary" onClick={() => run(() => confirmOrder(slug, orderId))} disabled={busy}
              className="w-full">
              Confirm order
            </Button>
          )}
          {canManage && (
            <Button variant="success" onClick={() => run(() => completeOrder(slug, orderId))} disabled={busy || balance > 0}
              className="w-full">
              Complete order
            </Button>
          )}
          {canManage && balance > 0 && (
            <p className="text-sm text-gray-500">Record the full payment to complete this order.</p>
          )}
          {canCancel && (
            <ConfirmDialog
              trigger={
                <Button variant="destructive" disabled={busy} className="w-full">
                  Cancel order
                </Button>
              }
              title="Cancel this order?"
              description={cancelWarning}
              confirmLabel="Cancel order"
              cancelLabel="Keep order"
              destructive
              onConfirm={() => run(() => cancelOrder(slug, orderId))}
            />
          )}
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
