import { useMemo, useState, type ReactNode, type UIEvent } from "react";

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  getKey,
  renderItem,
  ariaLabel,
}: {
  readonly items: readonly T[];
  readonly itemHeight: number;
  readonly height: number;
  readonly getKey: (item: T) => string;
  readonly renderItem: (item: T) => ReactNode;
  readonly ariaLabel: string;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const range = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 3);
    const visible = Math.ceil(height / itemHeight) + 6;
    return { start, end: Math.min(items.length, start + visible) };
  }, [height, itemHeight, items.length, scrollTop]);

  return (
    <div
      className="virtual-list"
      style={{ height }}
      onScroll={(event: UIEvent<HTMLDivElement>) =>
        setScrollTop(event.currentTarget.scrollTop)
      }
      role="list"
      aria-label={ariaLabel}
    >
      <div style={{ height: items.length * itemHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            insetInline: 0,
            top: range.start * itemHeight,
          }}
        >
          {items.slice(range.start, range.end).map((item) => (
            <div
              key={getKey(item)}
              role="listitem"
              style={{ height: itemHeight }}
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
