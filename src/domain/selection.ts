import type { DriveTree } from "./types";

function buildChildrenIndex(tree: DriveTree): Map<string, readonly string[]> {
  const mutable = new Map<string, string[]>();

  for (const item of tree.items) {
    if (item.parentId === null) continue;
    const siblings = mutable.get(item.parentId) ?? [];
    siblings.push(item.id);
    mutable.set(item.parentId, siblings);
  }

  return mutable;
}

export function descendantIds(
  tree: DriveTree,
  itemId: string,
): readonly string[] {
  const childrenByParent = buildChildrenIndex(tree);
  const descendants: string[] = [];
  const pending = [...(childrenByParent.get(itemId) ?? [])];

  while (pending.length > 0) {
    const currentId = pending.pop();
    if (currentId === undefined) continue;
    descendants.push(currentId);
    pending.push(...(childrenByParent.get(currentId) ?? []));
  }

  return descendants;
}

export function toggleSelection(
  tree: DriveTree,
  current: ReadonlySet<string>,
  itemId: string,
  selected: boolean,
): ReadonlySet<string> {
  const next = new Set(current);
  const affected = [itemId, ...descendantIds(tree, itemId)];

  for (const id of affected) {
    if (id === tree.rootId) continue;
    if (selected) next.add(id);
    else next.delete(id);
  }

  return next;
}

export function selectionState(
  tree: DriveTree,
  selectedIds: ReadonlySet<string>,
  itemId: string,
): "checked" | "mixed" | "unchecked" {
  const affected = [itemId, ...descendantIds(tree, itemId)].filter(
    (id) => id !== tree.rootId,
  );
  const selectedCount = affected.reduce(
    (count, id) => count + (selectedIds.has(id) ? 1 : 0),
    0,
  );

  if (selectedCount === 0) return "unchecked";
  if (selectedCount === affected.length) return "checked";
  return "mixed";
}
