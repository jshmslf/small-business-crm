type Option = { value: string; label: string; badge?: string };

export const ORDER_STATUSES = [
  { value: "PENDING", label: "Pending", badge: "bg-yellow-100 text-yellow-800" },
  { value: "CONFIRMED", label: "Confirmed", badge: "bg-blue-100 text-blue-800" },
  { value: "COMPLETED", label: "Completed", badge: "bg-green-100 text-green-800" },
  { value: "CANCELLED", label: "Cancelled", badge: "bg-gray-100 text-gray-500" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "UNPAID", label: "Unpaid", badge: "bg-red-100 text-red-700" },
  { value: "PARTIAL", label: "Partial", badge: "bg-orange-100 text-orange-800" },
  { value: "PAID", label: "Paid", badge: "bg-green-100 text-green-800" },
] as const;

export const ORDER_CHANNELS = [
  { value: "FACEBOOK", label: "Facebook / Messenger" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WEBSITE", label: "Website" },
  { value: "OTHER", label: "Other" },
] as const;

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "COD", label: "Cash on delivery" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
] as const;

export const FULFILLMENT_TYPES = [
  { value: "PICKUP", label: "Store pickup" },
  { value: "MEETUP", label: "Meetup" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "SHIPPING", label: "Courier shipping" },
] as const;

export const FULFILLMENT_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "READY", label: "Ready" },
  { value: "SHIPPED", label: "Shipped / On the way" },
  { value: "DELIVERED", label: "Delivered / Handed over" },
] as const;

export type OrderChannelValue = (typeof ORDER_CHANNELS)[number]["value"];
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];
export type FulfillmentTypeValue = (typeof FULFILLMENT_TYPES)[number]["value"];
export type FulfillmentStatusValue = (typeof FULFILLMENT_STATUSES)[number]["value"];

export function optionLabel(list: readonly Option[], value: string) {
  return list.find((o) => o.value === value)?.label ?? value;
}

export function optionBadge(list: readonly Option[], value: string) {
  return list.find((o) => o.value === value)?.badge ?? "bg-gray-100 text-gray-600";
}

export function isOption(list: readonly Option[], value: string) {
  return list.some((o) => o.value === value);
}

export function paymentStatusFor(amountPaid: number, total: number) {
  if (amountPaid >= total) return "PAID" as const;
  if (amountPaid > 0) return "PARTIAL" as const;
  return "UNPAID" as const;
}