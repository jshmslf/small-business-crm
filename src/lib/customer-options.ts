export const CUSTOMER_SOURCES = [
    { value: "FACEBOOK", label: "Facebook / Messenger" },
    { value: "WEBSITE", label: "Website" },
    { value: "INSTAGRAM", label: "Instagram" },
    { value: "WALK_IN", label: "Walk-in" },
    { value: "REFERRAL", label: "Referral" },
    { value: "OTHER", label: "Other" },
] as const;

export const CUSTOMER_STATUSES = [
    { value: "LEAD", label: "Lead", badge: "bg-yellow-100 text-yellow-800" },
    { value: "ACTIVE", label: "Active", badge: "bg-green-100 text-green-800" },
    { value: "REPEAT", label: "Repeat buyer", badge: "bg-blue-100 text-blue-800" },
    { value: "INACTIVE", label: "Inactive", badge: "bg-gray-100 text-gray-600" },
] as const;

export type CustomerSourceValue = (typeof CUSTOMER_SOURCES)[number]["value"];
export type CustomerStatusValue = (typeof CUSTOMER_STATUSES)[number]["value"];

export function sourceLabel(value: string) {
    return CUSTOMER_SOURCES.find((s) => s.value == value)?.label ?? value;
}

export function statusInfo(value: string) {
    return CUSTOMER_STATUSES.find((s) => s.value == value) ?? CUSTOMER_STATUSES[0];
}