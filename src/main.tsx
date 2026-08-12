import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-serif-display/400.css";
import App from "./App";
import { legalRoutes, type LegalRoute } from "./legalRoutes";
import "./styles.css";
import { LegalPage } from "./ui/LegalPages";
import { PrivacyControls } from "./ui/PrivacyControls";

const root = document.getElementById("root");
if (!root) throw new Error("Application root not found");

const pathname = window.location.pathname.replace(/\/$/, "") || "/";
const canonicalUrl = new URL(pathname, "https://drivetransfer.app").href;
document
  .querySelector<HTMLLinkElement>('link[rel="canonical"]')
  ?.setAttribute("href", canonicalUrl);
document
  .querySelector<HTMLMetaElement>('meta[property="og:url"]')
  ?.setAttribute("content", canonicalUrl);
const content = legalRoutes.has(pathname as LegalRoute) ? (
  <LegalPage route={pathname as LegalRoute} />
) : (
  <App />
);

createRoot(root).render(
  <StrictMode>
    {content}
    <PrivacyControls />
  </StrictMode>,
);
