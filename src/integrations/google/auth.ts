const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/script.send_mail",
  "https://www.googleapis.com/auth/script.scriptapp",
].join(" ");

interface TokenResponse {
  readonly access_token?: string;
  readonly expires_in?: number;
  readonly error?: string;
}

interface TokenClient {
  callback: (response: TokenResponse) => void;
  requestAccessToken(options: { readonly prompt: "consent" | "" }): void;
}

interface GoogleIdentityWindow extends Window {
  google?: typeof google & {
    accounts?: {
      oauth2?: {
        initTokenClient(options: {
          readonly client_id: string;
          readonly scope: string;
          readonly callback: (response: TokenResponse) => void;
          readonly error_callback: () => void;
        }): TokenClient;
        revoke(token: string, callback?: () => void): void;
      };
    };
  };
}

export interface GoogleSession {
  readonly accessToken: string;
  readonly expiresAt: number;
}

export interface GoogleClientConfiguration {
  readonly clientId: string;
  readonly apiKey: string;
  readonly appId: string;
  readonly appsScriptDeploymentId: string;
}

export function googleClientConfiguration(): GoogleClientConfiguration | null {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY?.trim();
  const appId = import.meta.env.VITE_GOOGLE_APP_ID?.trim();
  const appsScriptDeploymentId =
    import.meta.env.VITE_APPS_SCRIPT_DEPLOYMENT_ID?.trim();
  if (!clientId || !apiKey || !appId || !appsScriptDeploymentId) return null;
  return { clientId, apiKey, appId, appsScriptDeploymentId };
}

function identityWindow(): GoogleIdentityWindow {
  return window as GoogleIdentityWindow;
}

async function loadIdentityServices(): Promise<void> {
  if (identityWindow().google?.accounts?.oauth2) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      GOOGLE_IDENTITY_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const handleLoad = () => resolve();
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("GOOGLE_AUTH_UNAVAILABLE")),
      { once: true },
    );
    if (!existing) {
      script.id = GOOGLE_IDENTITY_SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  });
}

export async function requestGoogleSession(
  clientId: string,
): Promise<GoogleSession> {
  await loadIdentityServices();
  const oauth = identityWindow().google?.accounts?.oauth2;
  if (!oauth) throw new Error("GOOGLE_AUTH_UNAVAILABLE");

  return new Promise((resolve, reject) => {
    const tokenClient = oauth.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error("GOOGLE_AUTH_DENIED"));
          return;
        }
        resolve({
          accessToken: response.access_token,
          expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
        });
      },
      error_callback: () => reject(new Error("GOOGLE_AUTH_CANCELLED")),
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

export function revokeGoogleSession(session: GoogleSession): void {
  identityWindow().google?.accounts?.oauth2?.revoke(session.accessToken);
}

export function isGoogleSessionValid(session: GoogleSession): boolean {
  return Date.now() < session.expiresAt - 30_000;
}
