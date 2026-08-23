import { useEffect, useState } from "react";
import { inject, type BeforeSendEvent } from "@vercel/analytics";
import { normalizePublicEnvironmentValue } from "./environment";

export type ConsentState = "pending" | "accepted" | "rejected";

export interface PrivacyPreferences {
  readonly version: 3;
  readonly analytics: boolean;
  readonly decidedAt: string;
}

export interface DataDeletionSummary {
  readonly deletedDocuments: number;
  readonly deletedProperties: number;
  readonly deletedTriggers: number;
  readonly verified: boolean;
}

const PREFERENCES_KEY = "driveTransfer.privacyPreferences";
const CONSENT_VERSION = 3;
const GA_ID = normalizePublicEnvironmentValue(
  import.meta.env.VITE_GA_MEASUREMENT_ID,
);

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

function readPreferences(): PrivacyPreferences | null {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(PREFERENCES_KEY) ?? "null",
    ) as PrivacyPreferences | null;
    return parsed?.version === CONSENT_VERSION &&
      typeof parsed.analytics === "boolean" &&
      typeof parsed.decidedAt === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function removeAnalyticsCookies(): void {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (name?.startsWith("_ga")) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${window.location.hostname}; SameSite=Lax`;
    }
  });
}

function configureConsentDefaults(): void {
  window.dataLayer ??= [];
  window.gtag ??= (...args: unknown[]) => window.dataLayer?.push(args);
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function enableAnalytics(): void {
  inject({ beforeSend: filterVercelAnalyticsEvent });
  if (!GA_ID) return;
  configureConsentDefaults();
  window[`ga-disable-${GA_ID}`] = false;
  window.gtag?.("consent", "update", { analytics_storage: "granted" });
  window.gtag?.("js", new Date());
  window.gtag?.("config", GA_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  if (!document.querySelector("script[data-drivetransfer-analytics]")) {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.drivetransferAnalytics = "true";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.append(script);
  }
}

export function filterVercelAnalyticsEvent(
  event: BeforeSendEvent,
): BeforeSendEvent | null {
  return readPreferences()?.analytics ? event : null;
}

function disableAnalytics(): void {
  configureConsentDefaults();
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  if (GA_ID) window[`ga-disable-${GA_ID}`] = true;
  removeAnalyticsCookies();
}

export function savePrivacyPreferences(analytics: boolean): PrivacyPreferences {
  const preferences: PrivacyPreferences = {
    version: CONSENT_VERSION,
    analytics,
    decidedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  if (analytics) enableAnalytics();
  else disableAnalytics();
  window.dispatchEvent(new Event("drivetransfer:privacy-change"));
  return preferences;
}

export function clearDriveTransferLocalData(): void {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("driveTransfer."))
    .forEach((key) => window.localStorage.removeItem(key));
  disableAnalytics();
}

export function usePrivacyPreferences() {
  const [preferences, setPreferences] = useState<PrivacyPreferences | null>(
    () => readPreferences(),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    configureConsentDefaults();
    if (preferences?.analytics) enableAnalytics();
    else disableAnalytics();
    const update = () => setPreferences(readPreferences());
    const open = () => setSettingsOpen(true);
    window.addEventListener("drivetransfer:privacy-change", update);
    window.addEventListener("drivetransfer:privacy-open", open);
    return () => {
      window.removeEventListener("drivetransfer:privacy-change", update);
      window.removeEventListener("drivetransfer:privacy-open", open);
    };
  }, [preferences?.analytics]);

  const state: ConsentState = preferences
    ? preferences.analytics
      ? "accepted"
      : "rejected"
    : "pending";
  return { preferences, state, settingsOpen, setSettingsOpen };
}

export function openPrivacyPreferences(): void {
  window.dispatchEvent(new Event("drivetransfer:privacy-open"));
}
