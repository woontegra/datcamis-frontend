export const MAX_PRODUCT_OPTIONS = 3;

export type OptionPick = { attributeId: string; valueIds: string[] };
export type AttributeLike = { id: string; name: string; values: Array<{ id: string; name: string }> };

/** Every combination, one item from each group, in group order. */
export function combinations<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>((acc, group) => acc.flatMap((prefix) => group.map((item) => [...prefix, item])), [[]]);
}

/** Picked value ids in the attribute's own order, for options that have at least one value. */
export function activeGroups(picks: OptionPick[], attributes: AttributeLike[]) {
  return picks
    .map((pick) => {
      const attribute = attributes.find((item) => item.id === pick.attributeId);
      return attribute ? { attribute, valueIds: attribute.values.map((value) => value.id).filter((id) => pick.valueIds.includes(id)) } : null;
    })
    .filter((group): group is { attribute: AttributeLike; valueIds: string[] } => Boolean(group && group.valueIds.length));
}

export function comboLabel(valueIds: string[], attributes: AttributeLike[]) {
  return valueIds
    .map((id) => {
      for (const attribute of attributes) {
        const value = attribute.values.find((item) => item.id === id);
        if (value) return `${attribute.name}: ${value.name}`;
      }
      return "";
    })
    .filter(Boolean)
    .join(" · ");
}

/**
 * Matches current variant rows to the new combinations so existing variants (and their stock/SKU) are kept:
 * exact match first, then a row that is a narrower combination (an option was added),
 * then a wider one (an option was removed). Rows left over are returned as `removed`.
 * When the product already had options, rows without a combination are kept aside as they are (passive leftovers).
 */
export function planRows<R extends { id?: string; valueIds: string[] }>(rows: R[], hadOptions: boolean, combos: string[][], makeRow: (combo: string[]) => R) {
  const targets = combos.length ? combos : [[]];
  const pool = hadOptions ? rows.filter((row) => row.valueIds.length) : rows;
  const aside = hadOptions ? rows.filter((row) => !row.valueIds.length) : [];
  const used = new Set<R>();
  const assigned: Array<R | null> = targets.map(() => null);
  const tests: Array<(row: R, combo: Set<string>, size: number) => boolean> = [
    (row, combo, size) => row.valueIds.length === size && row.valueIds.every((id) => combo.has(id)),
    (row, combo) => row.valueIds.every((id) => combo.has(id)),
    (row, combo) => [...combo].every((id) => row.valueIds.includes(id)),
  ];
  for (const test of tests) {
    targets.forEach((combo, index) => {
      if (assigned[index]) return;
      const set = new Set(combo);
      const row = pool.find((item) => !used.has(item) && test(item, set, combo.length));
      if (row) {
        used.add(row);
        assigned[index] = row;
      }
    });
  }
  const next = targets.map((combo, index) => (assigned[index] ? { ...assigned[index]!, valueIds: combo } : makeRow(combo)));
  const removed = pool.filter((row) => !used.has(row) && row.id);
  return { rows: [...next, ...aside], removed };
}
