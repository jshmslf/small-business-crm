// 125050 -> "₱1,250.50"
export function formatPeso(centavos: number | null | undefined) {
    if (centavos == null) return "-";
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(centavos / 100);
}

// "1,250.50" -> 125050
export function parsePeso(input: string): { ok: true; value: number | null } | { ok: false } {
    const cleaned = input.replace(/[₱,\s]/g, "");
    if (cleaned === "") return { ok: true, value: null };
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return { ok: false };
    
    const [whole, fraction = ""] = cleaned.split(".");
    return { ok: true, value: Number(whole) * 100 + Number(fraction.padEnd(2, "0")) };
}

// 125050 -> "1250.50"
export function centavosToInput(centavos: number | null | undefined) {
    if (centavos == null) return "";
    return `${Math.floor(centavos / 100)}.${String(centavos % 100).padEnd(2, "0")}`;
}