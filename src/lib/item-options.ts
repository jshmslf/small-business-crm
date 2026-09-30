export const ITEM_CONDITIONS = [
    { value: "BRAND_NEW", label: "Brand new" },
    { value: "LIKE_NEW", label: "Like new" },
    { value: "GOOD", label: "Good" },
    { value: "FAIR", label: "Fair" },
    { value: "FOR_PARTS", label: "For parts" },
] as const;

export const ITEM_STATUSES = [
    { value: "DRAFT", label: "Draft", badge: "bg-gray-100 text-gray-600" },
    { value: "AVAILABLE", label: "Available", badge: "bg-green-100 text-green-800" },
    { value: "RESERVED", label: "Reserved", badge: "bg-yellow-100 text-yellow-800" },
    { value: "SOLD", label: "Sold", badge: "bg-blue-100 text-blue-800" },
    { value: "ARCHIVED", label: "Archived", badge: "bg-gray-100 text-gray-400" },
] as const;

export type ItemConditionValue = (typeof ITEM_CONDITIONS)[number]["value"];
export type ItemStatusValue = (typeof ITEM_STATUSES)[number]["value"];

export function conditionLabel(value: string) {
    return ITEM_CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export function itemStatusInfo(value: string) {
    return ITEM_STATUSES.find((s) => s.value === value) ?? ITEM_STATUSES[1];
}