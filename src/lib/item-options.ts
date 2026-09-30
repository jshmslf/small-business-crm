export const ITEM_CONDITIONS = [
    { value: "BRAND_NEW", label: "Brand new" },
    { value: "LIKE_NEW", label: "Like new" },
    { value: "GOOD", label: "Good" },
    { value: "FAIR", label: "Fair" },
    { value: "FOR_PARTS", label: "For parts" },
] as const;

export const ITEM_STATUSES = [
    { value: "DRAFT", label: "Draft" },
    { value: "AVAILABLE", label: "Available" },
    { value: "RESERVED", label: "Reserved" },
    { value: "SOLD", label: "Sold" },
    { value: "ARCHIVED", label: "Archived" },
] as const;

export type ItemConditionValue = (typeof ITEM_CONDITIONS)[number]["value"];
export type ItemStatusValue = (typeof ITEM_STATUSES)[number]["value"];

export function conditionLabel(value: string) {
    return ITEM_CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export function itemStatusInfo(value: string) {
    return ITEM_STATUSES.find((s) => s.value === value) ?? ITEM_STATUSES[1];
}