import { Badge, type BadgeTone } from "@/src/components/ui/badge";
import { statusInfo } from "@/src/lib/customer-options";
import { itemStatusInfo } from "@/src/lib/item-options";
import { ORDER_STATUSES, PAYMENT_STATUSES, optionLabel } from "@/src/lib/order-options";

export { Badge, type BadgeTone };

type StatusKind = "customer" | "item" | "order" | "payment";

/** The one place status colors are decided. Labels still come from the lib option lists. */
const TONES: Record<StatusKind, Record<string, BadgeTone>> = {
  customer: { LEAD: "warning", ACTIVE: "success", REPEAT: "brand", INACTIVE: "neutral" },
  item: { DRAFT: "neutral", AVAILABLE: "success", RESERVED: "warning", SOLD: "brand", ARCHIVED: "neutral" },
  order: { PENDING: "warning", CONFIRMED: "brand", COMPLETED: "success", CANCELLED: "neutral" },
  payment: { UNPAID: "error", PARTIAL: "warning", PAID: "success" },
};

function statusLabel(kind: StatusKind, value: string) {
  switch (kind) {
    case "customer":
      return statusInfo(value).label;
    case "item":
      return itemStatusInfo(value).label;
    case "order":
      return optionLabel(ORDER_STATUSES, value);
    case "payment":
      return optionLabel(PAYMENT_STATUSES, value);
  }
}

export function StatusBadge({
  kind,
  value,
  className,
}: {
  kind: StatusKind;
  value: string;
  className?: string;
}) {
  return (
    <Badge tone={TONES[kind][value] ?? "neutral"} className={className}>
      {statusLabel(kind, value)}
    </Badge>
  );
}
