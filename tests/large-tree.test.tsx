import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { DriveTree } from "../src/domain/types";
import { DriveTreeView } from "../src/ui/DriveTreeView";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("large Drive trees", () => {
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    container?.remove();
    container = undefined;
  });

  it("renders a 25,000 item tree through a small virtual window", () => {
    const tree: DriveTree = {
      rootId: "folder-root-example",
      items: [
        {
          id: "folder-root-example",
          parentId: null,
          name: "Origen",
          kind: "folder",
          mimeType: "application/vnd.google-apps.folder",
          relativePath: "",
          space: "my_drive",
          capabilities: { canRead: true, canCopy: true, canMove: true },
        },
        ...Array.from({ length: 25_000 }, (_, index) => ({
          id: "file-example-" + index,
          parentId: "folder-root-example",
          name: "Archivo " + index + ".pdf",
          kind: "file" as const,
          mimeType: "application/pdf",
          relativePath: "",
          space: "my_drive" as const,
          capabilities: { canRead: true, canCopy: true, canMove: true },
        })),
      ],
    };
    container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <DriveTreeView
          tree={tree}
          selectedIds={new Set()}
          onToggle={() => undefined}
        />,
      );
    });
    expect(container.querySelectorAll('[role="treeitem"]').length).toBeLessThan(
      40,
    );
    act(() => root.unmount());
  });
});
