"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const SCALE = 0.5;

function getStorageKeys(id: string | null) {
  if (id) {
    return [`posterPreview:${id}`, "posterPreviewHtml"];
  }
  return ["posterPreviewHtml"];
}

export default function PosterPreviewPage() {
  const [posterHtml, setPosterHtml] = useState<string>(() => {
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

  const scaledSize = useMemo(
    () => ({
      width: A4_WIDTH * SCALE,
      height: A4_HEIGHT * SCALE,
    }),
    [],
  );

  function downloadAsset(fileName: "poster.png" | "poster.pdf") {
    const a = document.createElement("a");
    a.href = `/assets/${fileName}`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function onRegeneratePoster() {
    const raw = window.localStorage.getItem("generationPayload");
    if (!raw) {
      setError("No generation state found. Generate first.");
      return;
    }
    const payload = JSON.parse(raw) as {
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
    };

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
      form.set("regenerate", "poster");
      form.set("brand", JSON.stringify(payload.brand ?? null));
      form.set("website", JSON.stringify(payload.website ?? null));
      form.set("social", JSON.stringify(payload.social ?? null));
      form.set("blogs", JSON.stringify(payload.blogs ?? null));
      form.set("branding", JSON.stringify(payload.branding ?? null));

      const res = await fetch("/api/generate", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to regenerate poster.");
        return;
      }

      const html = json?.poster?.html;
      if (typeof html === "string" && html.length > 0) {
        window.localStorage.setItem("posterPreviewHtml", html);
        setPosterHtml(html);
      }
      window.localStorage.setItem(
        "generationPayload",
        JSON.stringify({ ...payload, ...json }),
      );
    } catch {
      setError("Failed to regenerate poster.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Poster Preview</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadAsset("poster.png")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-foreground/15 px-4 text-sm font-medium hover:bg-foreground/5"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={() => downloadAsset("poster.pdf")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-foreground/15 px-4 text-sm font-medium hover:bg-foreground/5"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={onRegeneratePoster}
            disabled={regenerating}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
          >
            {regenerating ? "Regenerating..." : "Regenerate Poster"}
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

      <div className="flex flex-1 items-start justify-center overflow-auto rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6">
        {posterHtml ? (
          <div
            style={{ width: scaledSize.width, height: scaledSize.height }}
            className="relative overflow-hidden rounded-lg border border-foreground/15 bg-white shadow-md"
          >
            <div
              style={{
                width: A4_WIDTH,
                height: A4_HEIGHT,
                transform: `scale(${SCALE})`,
                transformOrigin: "top left",
              }}
              dangerouslySetInnerHTML={{ __html: posterHtml }}
            />
          </div>
        ) : (
          <p className="text-sm text-foreground/70">
            No poster HTML found in local state. Generate a poster first.
          </p>
        )}
      </div>
    </div>
  );
}

