export type CategoryOption = { id: string; name: string; parentId: string | null; sortOrder: number };

/** Flattens the category tree into indented select options. */
export function categoryOptions(categories: CategoryOption[]) {
  const children = new Map<string | null, CategoryOption[]>();
  for (const category of categories) children.set(category.parentId, [...(children.get(category.parentId) ?? []), category]);
  const out: Array<{ id: string; label: string }> = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const category of (children.get(parentId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder)) {
      out.push({ id: category.id, label: `${"— ".repeat(depth)}${category.name}` });
      walk(category.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
