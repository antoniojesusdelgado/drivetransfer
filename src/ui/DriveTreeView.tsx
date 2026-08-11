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

export function DriveTreeView({
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
