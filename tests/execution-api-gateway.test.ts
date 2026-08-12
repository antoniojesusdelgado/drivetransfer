import { afterEach, describe, expect, it, vi } from "vitest";
import { createExecutionApiGateway } from "../src/integrations/drive/executionApiGateway";

describe("Apps Script execution API gateway", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the access token only in the authorization header", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer test-token",
      });
      expect(init?.body).not.toContain("test-token");
      return new Response(
        JSON.stringify({
          done: true,
          response: {
            result: {
              id: "folder-source-123",
              name: "Source",
              space: "my_drive",
              capabilities: {
                canRead: true,
                canCopy: true,
                canMove: true,
                canAddChildren: true,
              },
            },
          },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const gateway = createExecutionApiGateway({
      accessToken: "test-token",
      deploymentId: "deployment-123",
    });

    await expect(
      gateway.inspectFolder("folder-source-123"),
    ).resolves.toMatchObject({
      id: "folder-source-123",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("turns an expired token into a safe session error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    const gateway = createExecutionApiGateway({
      accessToken: "expired-token",
      deploymentId: "deployment-123",
    });

    await expect(gateway.inspectFolder("folder-source-123")).rejects.toThrow(
      "GOOGLE_SESSION_EXPIRED",
    );
  });

  it("uses explicit private-storage operations for resumable jobs", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        function: string;
        parameters: readonly unknown[];
      };
      expect(body.function).toBe("saveTransferJob");
      expect(String(_url)).not.toContain("folder-source-123");
      return new Response(
        JSON.stringify({
          done: true,
          response: { result: body.parameters[0] },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const gateway = createExecutionApiGateway({
      accessToken: "test-token",
      deploymentId: "deployment-123",
    });
    const snapshot = {
      jobId: "job_plan_123",
      sourceFolderId: "folder-source-123",
      destinationFolderId: "folder-target-123",
      command: "copy" as const,
      duplicatePolicy: "skip" as const,
      selectedIds: ["source-item-123"],
      checkpoints: [],
      updatedAt: "2026-08-11T00:00:00.000Z",
    };

    await expect(gateway.saveJob(snapshot)).resolves.toEqual(snapshot);
  });

  it("retries a temporary quota response before succeeding", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            done: true,
            response: {
              result: {
                id: "folder-source-123",
                name: "Source",
                space: "my_drive",
                capabilities: {
                  canRead: true,
                  canCopy: true,
                  canMove: true,
                  canAddChildren: true,
                },
              },
            },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const gateway = createExecutionApiGateway({
      accessToken: "test-token",
      deploymentId: "deployment-123",
    });

    const request = gateway.inspectFolder("folder-source-123");
    await vi.runAllTimersAsync();
    await expect(request).resolves.toMatchObject({ id: "folder-source-123" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
