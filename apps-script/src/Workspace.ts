namespace DriveTransferRuntime {
  const WORKSPACE_DOCUMENT = "drive-transfer-workspace.v1.json";
  const TRIGGER_PROPERTY = "driveTransferDispatcherTrigger";
  const HISTORY_DAYS = 90;

  function emptyWorkspace(): WorkspaceSnapshot {
    return { jobs: [], schedules: [], history: [] };
  }

  function safeDate(value: string): number {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) throw new Error("INVALID_TRANSFER_REQUEST");
    return time;
  }

  function requireWorkspaceJob(job: WorkspaceJobRecord): WorkspaceJobRecord {
    requireOpaqueId(job?.id);
    if (
      typeof job.name !== "string" ||
      job.name.length < 1 ||
      job.name.length > 120 ||
      !["transfer", "dry_run", "sync"].includes(job.kind) ||
      (job.command !== "copy" && job.command !== "move") ||
      ![
        "queued",
        "running",
        "paused",
        "needs_attention",
        "cancelled",
        "completed",
      ].includes(job.status) ||
      !Number.isInteger(job.total) ||
      !Number.isInteger(job.completed) ||
      !Number.isInteger(job.failed) ||
      job.total < 0 ||
      job.completed < 0 ||
      job.failed < 0 ||
      job.completed > job.total
    ) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    safeDate(job.createdAt);
    safeDate(job.updatedAt);
    if (job.scheduleId) requireOpaqueId(job.scheduleId);
    return job;
  }

  function requireSchedule(
    schedule: TransferScheduleRecord,
  ): TransferScheduleRecord {
    requireOpaqueId(schedule?.id);
    requireDriveId(schedule.sourceFolderId);
    requireDriveId(schedule.destinationFolderId);
    if (
      schedule.sourceFolderId === schedule.destinationFolderId ||
      typeof schedule.name !== "string" ||
      schedule.name.length < 1 ||
      schedule.name.length > 80 ||
      !["transfer", "sync"].includes(schedule.kind) ||
      !["once", "daily", "weekly", "monthly"].includes(schedule.frequency) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(schedule.timeOfDay) ||
      typeof schedule.timeZone !== "string" ||
      schedule.timeZone.length > 80 ||
      typeof schedule.enabled !== "boolean" ||
      !schedule.filters ||
      typeof schedule.filters.nameIncludes !== "string" ||
      schedule.filters.nameIncludes.length > 200 ||
      !Array.isArray(schedule.filters.extensions) ||
      schedule.filters.extensions.length > 50 ||
      !Array.isArray(schedule.filters.kinds) ||
      schedule.filters.kinds.some(
        (kind) => kind !== "folder" && kind !== "file",
      ) ||
      !Array.isArray(schedule.filters.excludedPaths) ||
      schedule.filters.excludedPaths.length > 100 ||
      schedule.filters.excludedPaths.some(
        (path) => typeof path !== "string" || path.length > 2048,
      ) ||
      !["all", "new", "new_or_modified"].includes(schedule.filters.changeMode)
    ) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    safeDate(schedule.nextRunAt);
    safeDate(schedule.createdAt);
    safeDate(schedule.updatedAt);
    requireDuplicatePolicy(schedule.duplicatePolicy);
    return schedule;
  }

  function pruneWorkspace(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
    const cutoff = Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;
    return {
      jobs: snapshot.jobs.slice(0, 250).map(requireWorkspaceJob),
      schedules: snapshot.schedules.slice(0, 100).map(requireSchedule),
      history: snapshot.history
        .filter((item) => safeDate(item.finishedAt) >= cutoff)
        .slice(0, 1000),
    };
  }

  function readWorkspace(): WorkspaceSnapshot {
    const stored = readPrivateDocument<WorkspaceSnapshot>(
      WORKSPACE_DOCUMENT,
      "workspace",
    );
    return pruneWorkspace(stored ?? emptyWorkspace());
  }

  function writeWorkspace(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
    return writePrivateDocument(
      WORKSPACE_DOCUMENT,
      "workspace",
      pruneWorkspace(snapshot),
    );
  }

  function ensureOneRunning(
    jobs: readonly WorkspaceJobRecord[],
  ): readonly WorkspaceJobRecord[] {
    let activeSeen = false;
    return jobs.map((job) => {
      if (job.status !== "running") return job;
      if (!activeSeen) {
        activeSeen = true;
        return job;
      }
      return { ...job, status: "queued" };
    });
  }

  function promoteQueue(
    jobs: readonly WorkspaceJobRecord[],
  ): readonly WorkspaceJobRecord[] {
    if (jobs.some((job) => job.status === "running")) return jobs;
    const next = jobs.find((job) => job.status === "queued");
    return next
      ? jobs.map((job) =>
          job.id === next.id ? { ...job, status: "running" } : job,
        )
      : jobs;
  }

  function ensureDispatcher(hasSchedules: boolean): void {
    const properties = PropertiesService.getUserProperties();
    const storedId = properties.getProperty(TRIGGER_PROPERTY);
    const trigger = ScriptApp.getProjectTriggers().find(
      (item) => item.getUniqueId() === storedId,
    );
    if (hasSchedules && !trigger) {
      const created = ScriptApp.newTrigger("dispatchTransferSchedules")
        .timeBased()
        .everyMinutes(5)
        .create();
      properties.setProperty(TRIGGER_PROPERTY, created.getUniqueId());
    } else if (!hasSchedules && trigger) {
      ScriptApp.deleteTrigger(trigger);
      properties.deleteProperty(TRIGGER_PROPERTY);
    }
  }

  function advancedSchedule(
    schedule: TransferScheduleRecord,
  ): TransferScheduleRecord {
    if (schedule.frequency === "once") {
      return {
        ...schedule,
        enabled: false,
        updatedAt: new Date().toISOString(),
      };
    }
    const after = new Date(
      Math.max(Date.now(), new Date(schedule.nextRunAt).getTime()),
    );
    const time = schedule.timeOfDay.split(":").map(Number);
    let next: Date | undefined;
    for (let offset = 0; offset <= 370 && !next; offset += 1) {
      const probe = new Date(after.getTime() + offset * 86_400_000);
      const localDate = Utilities.formatDate(
        probe,
        schedule.timeZone,
        "yyyy-MM-dd",
      );
      const dateParts = localDate.split("-").map(Number);
      const utcGuess = Date.UTC(
        dateParts[0] as number,
        (dateParts[1] as number) - 1,
        dateParts[2] as number,
        time[0] as number,
        time[1] as number,
      );
      const offsetText = Utilities.formatDate(
        new Date(utcGuess),
        schedule.timeZone,
        "Z",
      );
      const sign = offsetText.startsWith("-") ? -1 : 1;
      const zoneMinutes =
        sign *
        (Number(offsetText.slice(1, 3)) * 60 + Number(offsetText.slice(3, 5)));
      const candidate = new Date(utcGuess - zoneMinutes * 60_000);
      if (candidate <= after) continue;
      const weekday =
        Number(Utilities.formatDate(candidate, schedule.timeZone, "u")) % 7;
      const monthDay = Number(
        Utilities.formatDate(candidate, schedule.timeZone, "d"),
      );
      if (
        schedule.frequency === "daily" ||
        (schedule.frequency === "weekly" && weekday === schedule.dayOfWeek) ||
        (schedule.frequency === "monthly" &&
          monthDay === Math.min(schedule.dayOfMonth ?? 1, 28))
      ) {
        next = candidate;
      }
    }
    if (!next) throw new Error("INVALID_TRANSFER_REQUEST");
    return {
      ...schedule,
      nextRunAt: next.toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function notifyCompletion(
    job: WorkspaceJobRecord,
    schedules: readonly TransferScheduleRecord[],
  ): void {
    if (job.status !== "completed" || !job.scheduleId) return;
    const schedule = schedules.find((item) => item.id === job.scheduleId);
    if (!schedule?.notifications.email) return;
    const recipient = Session.getEffectiveUser().getEmail();
    if (!recipient) return;
    MailApp.sendEmail({
      to: recipient,
      subject: "DriveTransfer: trabajo terminado",
      body:
        'La tarea "' +
        job.name +
        '" ha terminado. Abre DriveTransfer para consultar el informe privado.',
      noReply: true,
    });
  }

  export function loadWorkspace(): WorkspaceSnapshot {
    try {
      const snapshot = readWorkspace();
      writeWorkspace(snapshot);
      return snapshot;
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function saveWorkspaceJobRecord(
    job: WorkspaceJobRecord,
  ): WorkspaceJobRecord {
    try {
      const safe = requireWorkspaceJob(job);
      const snapshot = readWorkspace();
      const jobs = promoteQueue(
        ensureOneRunning([
          safe,
          ...snapshot.jobs.filter((item) => item.id !== safe.id),
        ]),
      );
      notifyCompletion(safe, snapshot.schedules);
      const history =
        safe.status === "completed" || safe.status === "cancelled"
          ? [
              {
                ...safe,
                finishedAt: safe.updatedAt,
                reportAvailable: true,
              },
              ...snapshot.history.filter((item) => item.id !== safe.id),
            ]
          : snapshot.history;
      writeWorkspace({ ...snapshot, jobs, history });
      return jobs.find((item) => item.id === safe.id) as WorkspaceJobRecord;
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function controlJob(request: {
    readonly jobId: string;
    readonly action: JobControlAction;
  }): WorkspaceSnapshot {
    try {
      const jobId = requireOpaqueId(request?.jobId);
      if (
        ![
          "pause",
          "resume",
          "cancel",
          "repeat",
          "retry_retryable",
          "retry_permissions",
        ].includes(request?.action)
      ) {
        throw new Error("INVALID_TRANSFER_REQUEST");
      }
      const snapshot = readWorkspace();
      const selected = snapshot.jobs.find((job) => job.id === jobId);
      if (!selected) throw new Error("DRIVE_NOT_FOUND");
      const allowed: Record<
        JobControlAction,
        readonly WorkspaceJobRecord["status"][]
      > = {
        pause: ["running"],
        resume: ["paused", "needs_attention"],
        cancel: ["queued", "running", "paused", "needs_attention"],
        repeat: ["completed", "cancelled", "needs_attention"],
        retry_retryable: ["needs_attention"],
        retry_permissions: ["needs_attention"],
      };
      if (!allowed[request.action].includes(selected.status)) {
        throw new Error("INVALID_JOB_TRANSITION");
      }
      const now = new Date().toISOString();
      let jobs: readonly WorkspaceJobRecord[];
      if (request.action === "repeat") {
        const repeated: WorkspaceJobRecord = {
          ...selected,
          id: "job_repeat_" + Utilities.getUuid().replace(/-/g, ""),
          status: snapshot.jobs.some((job) => job.status === "running")
            ? "queued"
            : "running",
          completed: 0,
          failed: 0,
          createdAt: now,
          updatedAt: now,
        };
        jobs = [repeated, ...snapshot.jobs];
      } else {
        jobs = snapshot.jobs.map((job) => {
          if (job.id !== jobId) return job;
          const status =
            request.action === "pause"
              ? "paused"
              : request.action === "cancel"
                ? "cancelled"
                : "running";
          return {
            ...job,
            status,
            failed: request.action.indexOf("retry_") === 0 ? 0 : job.failed,
            updatedAt: now,
          };
        });
      }
      jobs = promoteQueue(ensureOneRunning(jobs));
      return writeWorkspace({ ...snapshot, jobs });
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function saveScheduleRecord(
    schedule: TransferScheduleRecord,
  ): TransferScheduleRecord {
    try {
      const safe = requireSchedule(schedule);
      const snapshot = readWorkspace();
      const schedules = [
        safe,
        ...snapshot.schedules.filter((item) => item.id !== safe.id),
      ];
      writeWorkspace({ ...snapshot, schedules });
      ensureDispatcher(
        schedules.some((item) => item.enabled) ||
          snapshot.jobs.some(
            (item) =>
              item.scheduleId &&
              ["queued", "running", "paused", "needs_attention"].includes(
                item.status,
              ),
          ),
      );
      return safe;
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function deleteScheduleRecord(request: {
    readonly scheduleId: string;
  }): void {
    try {
      const scheduleId = requireOpaqueId(request?.scheduleId);
      const snapshot = readWorkspace();
      const schedules = snapshot.schedules.filter(
        (item) => item.id !== scheduleId,
      );
      writeWorkspace({ ...snapshot, schedules });
      ensureDispatcher(
        schedules.some((item) => item.enabled) ||
          snapshot.jobs.some(
            (item) =>
              item.scheduleId &&
              ["queued", "running", "paused", "needs_attention"].includes(
                item.status,
              ),
          ),
      );
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  function enqueueSchedule(
    snapshot: WorkspaceSnapshot,
    schedule: TransferScheduleRecord,
  ): WorkspaceSnapshot {
    const now = new Date().toISOString();
    const job: WorkspaceJobRecord = {
      id: "job_schedule_" + Utilities.getUuid().replace(/-/g, ""),
      name: schedule.name,
      kind: schedule.kind === "sync" ? "sync" : "transfer",
      command: "copy",
      status: snapshot.jobs.some((item) => item.status === "running")
        ? "queued"
        : "running",
      sourceLabel: "Origen programado",
      destinationLabel: "Destino programado",
      createdAt: now,
      updatedAt: now,
      total: 0,
      completed: 0,
      failed: 0,
      scheduleId: schedule.id,
    };
    return { ...snapshot, jobs: [...snapshot.jobs, job] };
  }

  interface ScheduledCursor {
    readonly folderId: string;
    readonly driveId?: string;
    readonly relativePath: string;
    readonly pageToken?: string;
  }

  interface ScheduledExecutionState {
    readonly pending: readonly ScheduledCursor[];
    readonly buffer: readonly RuntimeTransferOperation[];
    readonly total: number;
    readonly completed: number;
    readonly failed: number;
  }

  function scheduledStateDocument(jobId: string): string {
    return (
      "drive-transfer-job-" +
      requireOpaqueId(jobId) +
      "-scheduled-state.v1.json"
    );
  }

  function initialScheduledState(
    schedule: TransferScheduleRecord,
  ): ScheduledExecutionState {
    const source = inspectFolder({ folderId: schedule.sourceFolderId });
    return {
      pending: [
        {
          folderId: source.id,
          driveId: source.driveId,
          relativePath: "",
        },
      ],
      buffer: [],
      total: 0,
      completed: 0,
      failed: 0,
    };
  }

  function fillScheduledBuffer(
    schedule: TransferScheduleRecord,
    state: ScheduledExecutionState,
  ): ScheduledExecutionState {
    const cursor = state.pending[0];
    if (!cursor || state.buffer.length > 0) return state;
    const page = listFolderPage({
      folderId: cursor.folderId,
      driveId: cursor.driveId,
      pageToken: cursor.pageToken,
      pageSize: 100,
    });
    const childFolders: ScheduledCursor[] = [];
    const buffer = page.items.flatMap((item) => {
      if (item.kind === "shortcut") return [];
      if (item.kind === "folder") {
        childFolders.push({
          folderId: item.id,
          driveId: item.driveId,
          relativePath: cursor.relativePath
            ? cursor.relativePath + "/" + item.name
            : item.name,
        });
      }
      const operation = prepareScheduledOperation(
        schedule,
        item,
        cursor.relativePath,
      );
      return operation ? [operation] : [];
    });
    const current = page.nextPageToken
      ? [{ ...cursor, pageToken: page.nextPageToken }]
      : [];
    return {
      ...state,
      pending: [...current, ...state.pending.slice(1), ...childFolders],
      buffer,
      total: state.total + buffer.length,
    };
  }

  function updateScheduledJob(
    snapshot: WorkspaceSnapshot,
    job: WorkspaceJobRecord,
    state: ScheduledExecutionState,
    status: WorkspaceJobRecord["status"],
  ): WorkspaceSnapshot {
    const updated: WorkspaceJobRecord = {
      ...job,
      status,
      total: state.total,
      completed: state.completed,
      failed: state.failed,
      updatedAt: new Date().toISOString(),
    };
    const jobs = snapshot.jobs.map((item) =>
      item.id === updated.id ? updated : item,
    );
    if (status !== "completed") return { ...snapshot, jobs };
    const history: HistoryRecord[] = [
      {
        ...updated,
        finishedAt: updated.updatedAt,
        reportAvailable: true,
      },
      ...snapshot.history.filter((item) => item.id !== updated.id),
    ];
    notifyCompletion(updated, snapshot.schedules);
    return { ...snapshot, jobs: promoteQueue(jobs), history };
  }

  function processScheduledJob(
    snapshot: WorkspaceSnapshot,
    startedAt: number,
  ): WorkspaceSnapshot {
    const job = snapshot.jobs.find(
      (item) => item.status === "running" && item.scheduleId,
    );
    if (!job?.scheduleId) return snapshot;
    const schedule = snapshot.schedules.find(
      (item) => item.id === job.scheduleId,
    );
    if (!schedule) {
      return updateScheduledJob(
        snapshot,
        job,
        { pending: [], buffer: [], total: 0, completed: 0, failed: 1 },
        "needs_attention",
      );
    }
    const document = scheduledStateDocument(job.id);
    let state =
      readPrivateDocument<ScheduledExecutionState>(
        document,
        "scheduled-state",
      ) ?? initialScheduledState(schedule);
    const destination = inspectFolder({
      folderId: schedule.destinationFolderId,
    });
    while (Date.now() - startedAt < 240_000) {
      state = fillScheduledBuffer(schedule, state);
      if (state.buffer.length === 0) {
        if (state.pending.length > 0) continue;
        deletePrivateDocument(document);
        return updateScheduledJob(snapshot, job, state, "completed");
      }
      const batch = state.buffer.slice(0, 10);
      const response = executeBatch({
        jobId: job.id,
        command: "copy",
        sourceRootId: schedule.sourceFolderId,
        destinationFolderId: schedule.destinationFolderId,
        destinationSpace: destination.space,
        moveConfirmed: false,
        operations: batch,
      });
      const failed = response.checkpoints.filter((checkpoint) =>
        ["failed_retryable", "failed_terminal"].includes(checkpoint.result),
      ).length;
      const retryableKeys = new Set(
        response.checkpoints
          .filter((checkpoint) => checkpoint.result === "failed_retryable")
          .map((checkpoint) => checkpoint.operationKey),
      );
      const retryableOperations = batch.filter((operation) =>
        retryableKeys.has(operation.operationKey),
      );
      state = {
        ...state,
        buffer: [...retryableOperations, ...state.buffer.slice(batch.length)],
        completed: state.completed + response.checkpoints.length - failed,
        failed: state.failed + failed,
      };
      writePrivateDocument(document, "scheduled-state", state);
      snapshot = updateScheduledJob(
        snapshot,
        job,
        state,
        response.paused ? "needs_attention" : "running",
      );
      writeWorkspace(snapshot);
      if (response.paused) return snapshot;
      Utilities.sleep(200);
    }
    writePrivateDocument(document, "scheduled-state", state);
    return updateScheduledJob(snapshot, job, state, "running");
  }

  export function runScheduleNow(request: {
    readonly scheduleId: string;
  }): WorkspaceSnapshot {
    try {
      const scheduleId = requireOpaqueId(request?.scheduleId);
      const snapshot = readWorkspace();
      const schedule = snapshot.schedules.find(
        (item) => item.id === scheduleId,
      );
      if (!schedule) throw new Error("DRIVE_NOT_FOUND");
      ensureDispatcher(true);
      return writeWorkspace(enqueueSchedule(snapshot, schedule));
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function dispatchSchedules(): void {
    const lock = LockService.getUserLock();
    if (!lock.tryLock(1000)) return;
    try {
      let snapshot = readWorkspace();
      const due = snapshot.schedules.filter(
        (schedule) =>
          schedule.enabled &&
          new Date(schedule.nextRunAt).getTime() <= Date.now(),
      );
      for (const schedule of due) {
        snapshot = enqueueSchedule(snapshot, schedule);
      }
      if (due.length > 0) {
        const dueIds = new Set(due.map((schedule) => schedule.id));
        snapshot = {
          ...snapshot,
          schedules: snapshot.schedules.map((schedule) =>
            dueIds.has(schedule.id) ? advancedSchedule(schedule) : schedule,
          ),
        };
      }
      try {
        snapshot = processScheduledJob(snapshot, Date.now());
      } catch {
        const active = snapshot.jobs.find(
          (item) => item.status === "running" && item.scheduleId,
        );
        if (active) {
          snapshot = {
            ...snapshot,
            jobs: snapshot.jobs.map((item) =>
              item.id === active.id
                ? {
                    ...item,
                    status: "needs_attention",
                    failed: Math.max(1, item.failed),
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
          };
        }
      }
      writeWorkspace(snapshot);
      ensureDispatcher(
        snapshot.schedules.some((item) => item.enabled) ||
          snapshot.jobs.some(
            (item) =>
              item.scheduleId &&
              ["queued", "running", "paused", "needs_attention"].includes(
                item.status,
              ),
          ),
      );
    } finally {
      lock.releaseLock();
    }
  }

  export function prunePrivateHistory(): WorkspaceSnapshot {
    return writeWorkspace(readWorkspace());
  }
}
