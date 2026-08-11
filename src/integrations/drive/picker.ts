const PICKER_SCRIPT_ID = "google-picker-api";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

interface GoogleApiLoader {
  load(
    api: string,
    options: {
      callback: () => void;
      onerror: () => void;
      timeout: number;
      ontimeout: () => void;
    },
  ): void;
}

declare global {
  interface Window {
    gapi?: GoogleApiLoader;
  }
}

export interface PickerFolderSelection {
  readonly id: string;
  readonly name: string;
}

export interface PickerSession {
  readonly accessToken: string;
  readonly apiKey: string;
  readonly appId: string;
}

async function loadPickerApi(): Promise<void> {
  if (typeof google !== "undefined" && google.picker && window.gapi) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      PICKER_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const handleLoad = () => {
      if (!window.gapi) {
        reject(new Error("PICKER_LOADER_UNAVAILABLE"));
        return;
      }
      window.gapi.load("picker", {
        callback: resolve,
        onerror: () => reject(new Error("PICKER_LOAD_FAILED")),
        timeout: 10_000,
        ontimeout: () => reject(new Error("PICKER_LOAD_TIMEOUT")),
      });
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("PICKER_SCRIPT_FAILED")),
      {
        once: true,
      },
    );
    if (!existing) {
      script.id = PICKER_SCRIPT_ID;
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      script.defer = true;
      document.head.append(script);
    } else if (window.gapi) {
      handleLoad();
    }
  });
}

export async function openFolderPicker(
  session: PickerSession,
): Promise<PickerFolderSelection | null> {
  await loadPickerApi();

  return new Promise((resolve, reject) => {
    const myDriveView = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMode(google.picker.DocsViewMode.LIST);
    const sharedDrivesView = new google.picker.DocsView(
      google.picker.ViewId.FOLDERS,
    )
      .setEnableDrives(true)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMode(google.picker.DocsViewMode.LIST);

    try {
      const picker = new google.picker.PickerBuilder()
        .addView(myDriveView)
        .addView(sharedDrivesView)
        .setSelectableMimeTypes(FOLDER_MIME_TYPE)
        .setOAuthToken(session.accessToken)
        .setDeveloperKey(session.apiKey)
        .setAppId(session.appId)
        .setOrigin(window.location.origin)
        .setTitle("Selecciona una carpeta de Google Drive")
        .setCallback((response) => {
          const action = response[google.picker.Response.ACTION];
          if (action === google.picker.Action.CANCEL) {
            resolve(null);
            return;
          }
          if (action !== google.picker.Action.PICKED) return;
          const document = response[google.picker.Response.DOCUMENTS]?.[0];
          const id = document?.[google.picker.Document.ID];
          const name = document?.[google.picker.Document.NAME];
          if (!id || !name) {
            reject(new Error("PICKER_INVALID_SELECTION"));
            return;
          }
          resolve({ id, name });
        })
        .build();
      picker.setVisible(true);
    } catch {
      reject(new Error("PICKER_OPEN_FAILED"));
    }
  });
}
