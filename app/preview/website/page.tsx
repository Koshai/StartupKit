"use client";

import Link from "next/link";
import { useState } from "react";

type GenerationPayload = {
  input?: {
    startupName?: string;
    description?: string;
    tone?: string;
    businessType?: string;
    layout?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    qrUrl?: string;
  };
  brand?: unknown;
  website?: unknown;
  social?: unknown;
  blogs?: unknown;
  branding?: unknown;
  websiteHtml?: string;
};

function getStorageKeys(id: string | null) {
  if (id) {
    return [`websitePreview:${id}`, "websitePreviewHtml"];
  }
  return ["websitePreviewHtml"];
}

export default function WebsitePreviewPage() {
  const [websiteHtml, setWebsiteHtml] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    const id = new URLSearchParams(window.location.search).get("id");
    const keys = getStorageKeys(id);
    for (const key of keys) {
      const value = window.localStorage.getItem(key);
      if (value) {
        return value;
      }
    }
    return "";
  });
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function onRegenerateWebsite() {
    const raw = window.localStorage.getItem("generationPayload");
    if (!raw) {
      setError("No generation state found. Generate first.");
      return;
    }
    const payload = JSON.parse(raw) as GenerationPayload;
    const startupName = payload.input?.startupName ?? "";
    const description = payload.input?.description ?? "";
    const tone = payload.input?.tone ?? "";
    if (!startupName || !description || !tone) {
      setError("Missing input data for regeneration.");
      return;
    }

    setRegenerating(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("startupName", startupName);
      form.set("description", description);
      form.set("tone", tone);
      form.set("businessType", payload.input?.businessType ?? "");
      form.set("layout", payload.input?.layout ?? "centered");
      form.set("primaryColor", payload.input?.primaryColor ?? "");
      form.set("secondaryColor", payload.input?.secondaryColor ?? "");
      form.set("accentColor", payload.input?.accentColor ?? "");
      form.set("qrUrl", payload.input?.qrUrl ?? "");
      form.set("regenerate", "website");
      form.set("brand", JSON.stringify(payload.brand ?? null));
      form.set("website", JSON.stringify(payload.website ?? null));
      form.set("social", JSON.stringify(payload.social ?? null));
      form.set("blogs", JSON.stringify(payload.blogs ?? null));
      form.set("branding", JSON.stringify(payload.branding ?? null));

      const res = await fetch("/api/generate", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to regenerate website.");
        return;
      }

      const nextPayload = { ...payload, ...json };
      window.localStorage.setItem("generationPayload", JSON.stringify(nextPayload));
      if (json.websiteHtml) {
        window.localStorage.setItem("websitePreviewHtml", json.websiteHtml);
        setWebsiteHtml(json.websiteHtml);
      }
    } catch {
      setError("Failed to regenerate website.");
    } finally {
      setRegenerating(false);
    }
  }

  async function onDownloadZip() {
    const raw = window.localStorage.getItem("generationPayload");
    if (!raw) {
      setError("No generation state found. Generate first.");
      return;
    }
    const payload = JSON.parse(raw) as GenerationPayload;
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: payload.brand,
          website: payload.website,
          social: payload.social,
          blogs: payload.blogs,
          branding: payload.branding,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json?.error ?? "Failed to download ZIP.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "launch-kit.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Failed to download ZIP.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Website Preview</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onDownloadZip}
            disabled={downloading}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-foreground/15 px-4 text-sm font-medium hover:bg-foreground/5 disabled:opacity-60"
          >
            {downloading ? "Preparing..." : "Download ZIP"}
          </button>
          <button
            type="button"
            onClick={onRegenerateWebsite}
            disabled={regenerating}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
          >
            {regenerating ? "Regenerating..." : "Regenerate Website"}
          </button>
          <Link
            href="/generate"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-foreground/15 px-4 text-sm font-medium hover:bg-foreground/5"
          >
            Back to Generate
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-foreground/10 bg-white shadow-sm">
        {websiteHtml ? (
          <div dangerouslySetInnerHTML={{ __html: websiteHtml }} />
        ) : (
          <p className="p-6 text-sm text-foreground/70">
            No website HTML found in local state. Generate first.
          </p>
        )}
      </div>
    </div>
  );
}

