export function schoolingRecords(data: unknown): Record<string, unknown>[] {
  const items = Array.isArray(data) ? data :
    data && typeof data === "object" && "result" in data ? data.result : undefined;
  if (!Array.isArray(items)) throw new Error("De opleidingsgegevens bevatten geen geldige lijst.");
  return items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Een opleiding heeft een ongeldig formaat.");
    }
    return item as Record<string, unknown>;
  });
}
