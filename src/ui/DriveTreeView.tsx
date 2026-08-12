import {
  CaretDown,
  CaretRight,
  File,
  FolderSimple,
  LockSimple,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { selectionState } from "../domain/selection";
import type { DriveItem, DriveTree } from "../domain/types";
import { VirtualList } from "./VirtualList";

interface DriveTreeViewProps {
  readonly tree: DriveTree;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggle: (itemId: string, selected: boolean) => void;
  readonly query?: string;
}

function TreeCheckbox({
  item,
  tree,
  selectedIds,
  onToggle,
}: Omit<DriveTreeViewProps, "query"> & { readonly item: DriveItem }) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const state = selectionState(tree, selectedIds, item.id);

  useEffect(() => {
    if (checkboxRef.current)
      checkboxRef.current.indeterminate = state === "mixed";
  }, [state]);

  return (
    <label className="tree-row__choice">
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={state === "checked"}
        aria-checked={state === "mixed" ? "mixed" : state === "checked"}
        onChange={(event) => onToggle(item.id, event.target.checked)}
      />
      <span className="tree-row__icon" aria-hidden="true">
        {item.kind === "folder" ? (
          <FolderSimple size={22} weight="duotone" />
        ) : (
          <File size={21} weight="duotone" />
        )}
      </span>
      <span className="tree-row__name">{item.name}</span>
      {item.capabilities.canCopy && item.capabilities.canMove ? null : (
        <span className="tree-row__permission">
          <LockSimple size={14} aria-hidden="true" />
          No tienes permiso
        </span>
      )}
    </label>
  );
}

function SmallDriveTreeView({
  tree,
  selectedIds,
  onToggle,
  query = "",
}: DriveTreeViewProps) {
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, DriveItem[]>();
    for (const item of tree.items) {
      const siblings = map.get(item.parentId) ?? [];
      siblings.push(item);
      map.set(item.parentId, siblings);
    }
    return map;
  }, [tree]);
  const normalizedQuery = query.trim().toLocaleLowerCase("es");

  const branchMatches = (item: DriveItem): boolean => {
    if (!normalizedQuery) return true;
    if (item.name.toLocaleLowerCase("es").includes(normalizedQuery))
      return true;
    return (childrenByParent.get(item.id) ?? []).some(branchMatches);
  };

  const toggleCollapsed = (itemId: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const renderBranch = (parentId: string): React.ReactNode => {
    const matchingItems = (childrenByParent.get(parentId) ?? []).filter(
      branchMatches,
    );
    return (
      <ul role="group">
        {matchingItems.map((item) => {
          const isFolder = item.kind === "folder";
          const collapsed = collapsedIds.has(item.id) && !normalizedQuery;
          return (
            <li
              key={item.id}
              role="treeitem"
              aria-expanded={isFolder ? !collapsed : undefined}
            >
              <div className="tree-row">
                {isFolder ? (
                  <button
                    className="tree-row__toggle"
                    onClick={() => toggleCollapsed(item.id)}
                    aria-label={`${collapsed ? "Mostrar" : "Ocultar"} ${item.name}`}
                  >
                    {collapsed ? <CaretRight /> : <CaretDown />}
                  </button>
                ) : (
                  <span className="tree-row__spacer" />
                )}
                <TreeCheckbox
                  item={item}
                  tree={tree}
                  selectedIds={selectedIds}
                  onToggle={onToggle}
                />
              </div>
              {isFolder && !collapsed ? renderBranch(item.id) : null}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div
      className="tree"
      role="tree"
      aria-label="Contenido de la carpeta de origen"
    >
      {renderBranch(tree.rootId)}
      {normalizedQuery &&
      !(childrenByParent.get(tree.rootId) ?? []).some(branchMatches) ? (
        <p className="empty-state">
          No hay archivos que coincidan con la búsqueda.
        </p>
      ) : null}
    </div>
  );
}

function LargeCheckbox({
  item,
  state,
  onToggle,
}: {
  readonly item: DriveItem;
  readonly state: "checked" | "mixed" | "unchecked";
  readonly onToggle: (itemId: string, selected: boolean) => void;
}) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkboxRef.current)
      checkboxRef.current.indeterminate = state === "mixed";
  }, [state]);
  return (
    <label className="tree-row__choice">
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={state === "checked"}
        aria-checked={state === "mixed" ? "mixed" : state === "checked"}
        onChange={(event) => onToggle(item.id, event.target.checked)}
      />
      <span className="tree-row__icon" aria-hidden="true">
        {item.kind === "folder" ? (
          <FolderSimple size={22} weight="duotone" />
        ) : (
          <File size={21} weight="duotone" />
        )}
      </span>
      <span className="tree-row__name">{item.name}</span>
      {item.capabilities.canCopy && item.capabilities.canMove ? null : (
        <span className="tree-row__permission">
          <LockSimple size={14} aria-hidden="true" />
          No tienes permiso
        </span>
      )}
    </label>
  );
}

function LargeDriveTreeView({
  tree,
  selectedIds,
  onToggle,
  query = "",
}: DriveTreeViewProps) {
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, DriveItem[]>();
    for (const item of tree.items) {
      const children = map.get(item.parentId) ?? [];
      children.push(item);
      map.set(item.parentId, children);
    }
    return map;
  }, [tree.items]);
  const itemById = useMemo(
    () => new Map(tree.items.map((item) => [item.id, item])),
    [tree.items],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const matchingIds = useMemo(() => {
    if (!normalizedQuery) return null;
    const matches = new Set<string>();
    for (const item of tree.items) {
      if (!item.name.toLocaleLowerCase("es").includes(normalizedQuery))
        continue;
      let current: DriveItem | undefined = item;
      while (current) {
        matches.add(current.id);
        current = current.parentId ? itemById.get(current.parentId) : undefined;
      }
    }
    return matches;
  }, [itemById, normalizedQuery, tree.items]);
  const states = useMemo(() => {
    const counts = new Map<string, { total: number; selected: number }>();
    const stack: Array<{ id: string; visited: boolean }> = [
      { id: tree.rootId, visited: false },
    ];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (!current.visited) {
        stack.push({ id: current.id, visited: true });
        for (const child of childrenByParent.get(current.id) ?? []) {
          stack.push({ id: child.id, visited: false });
        }
        continue;
      }
      let total = current.id === tree.rootId ? 0 : 1;
      let selected =
        current.id !== tree.rootId && selectedIds.has(current.id) ? 1 : 0;
      for (const child of childrenByParent.get(current.id) ?? []) {
        const count = counts.get(child.id);
        total += count?.total ?? 0;
        selected += count?.selected ?? 0;
      }
      counts.set(current.id, { total, selected });
    }
    return new Map(
      [...counts].map(([id, count]) => [
        id,
        count.selected === 0
          ? ("unchecked" as const)
          : count.selected === count.total
            ? ("checked" as const)
            : ("mixed" as const),
      ]),
    );
  }, [childrenByParent, selectedIds, tree.rootId]);
  const visible = useMemo(() => {
    const result: Array<{ item: DriveItem; depth: number }> = [];
    const roots = childrenByParent.get(tree.rootId) ?? [];
    const stack = roots
      .slice()
      .reverse()
      .map((item) => ({ item, depth: 0 }));
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (matchingIds && !matchingIds.has(current.item.id)) continue;
      result.push(current);
      if (
        current.item.kind !== "folder" ||
        (collapsedIds.has(current.item.id) && !normalizedQuery)
      )
        continue;
      const children = childrenByParent.get(current.item.id) ?? [];
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (child) stack.push({ item: child, depth: current.depth + 1 });
      }
    }
    return result;
  }, [
    childrenByParent,
    collapsedIds,
    matchingIds,
    normalizedQuery,
    tree.rootId,
  ]);
  const toggleCollapsed = (itemId: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };
  return (
    <div
      className="tree tree--virtual"
      role="tree"
      aria-label="Contenido de la carpeta de origen"
    >
      <VirtualList
        items={visible}
        itemHeight={48}
        height={Math.min(520, Math.max(48, visible.length * 48))}
        getKey={({ item }) => item.id}
        ariaLabel="Elementos disponibles"
        renderItem={({ item, depth }) => {
          const isFolder = item.kind === "folder";
          const collapsed = collapsedIds.has(item.id) && !normalizedQuery;
          return (
            <div
              className="tree-row"
              role="treeitem"
              aria-level={depth + 1}
              aria-expanded={isFolder ? !collapsed : undefined}
              style={{ paddingInlineStart: depth * 20 }}
            >
              {isFolder ? (
                <button
                  className="tree-row__toggle"
                  onClick={() => toggleCollapsed(item.id)}
                  aria-label={(collapsed ? "Mostrar " : "Ocultar ") + item.name}
                >
                  {collapsed ? <CaretRight /> : <CaretDown />}
                </button>
              ) : (
                <span className="tree-row__spacer" />
              )}
              <LargeCheckbox
                item={item}
                state={states.get(item.id) ?? "unchecked"}
                onToggle={onToggle}
              />
            </div>
          );
        }}
      />
      {normalizedQuery && visible.length === 0 ? (
        <p className="empty-state">
          No hay archivos que coincidan con la búsqueda.
        </p>
      ) : null}
    </div>
  );
}

export function DriveTreeView(props: DriveTreeViewProps) {
  return props.tree.items.length > 500 ? (
    <LargeDriveTreeView {...props} />
  ) : (
    <SmallDriveTreeView {...props} />
  );
}
