"use client";

import { useState } from "react";
import Link from "next/link";

type GenerateResponse = {
  input: {
    startupName: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  uploads?: {
    logo?: { path: string } | null;
    heroImage?: { path: string } | null;
  };
  branding?: {
    brandName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoPath?: string;
    heroImagePath?: string;
    socials?: {
      twitter?: string;
      linkedin?: string;
      instagram?: string;
    };
    contactEmail?: string;
  };
  brand: {
    tagline: string;
  };
  website: {
    hero_title: string;
    hero_subtitle: string;
    features: Array<string | { title?: string; description?: string }>;
    call_to_action: string;
  };
  social: {
    posts: string[];
  };
  blogs: {
    blogs: Array<{
      title: string;
      content: string;
    }>;
  };
};

export function GenerateForm() {
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [heroFileName, setHeroFileName] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      startupName: (form.elements.namedItem("startupName") as HTMLInputElement)
        .value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement)
        .value,
      tone: (form.elements.namedItem("tone") as HTMLInputElement).value,
      twitterUrl: (form.elements.namedItem("twitterUrl") as HTMLInputElement)
        .value,
      linkedinUrl: (form.elements.namedItem("linkedinUrl") as HTMLInputElement)
        .value,
      instagramUrl: (form.elements.namedItem("instagramUrl") as HTMLInputElement)
        .value,
      contactEmail: (form.elements.namedItem("contactEmail") as HTMLInputElement)
        .value,
      primaryColor: (form.elements.namedItem("primaryColor") as HTMLInputElement)
        .value,
      secondaryColor: (
        form.elements.namedItem("secondaryColor") as HTMLInputElement
      ).value,
    };
    const formData = new FormData(form);
    formData.set("startupName", data.startupName);
    formData.set("description", data.description);
    formData.set("tone", data.tone);
    formData.set("twitterUrl", data.twitterUrl);
    formData.set("twitter", data.twitterUrl);
    formData.set("linkedinUrl", data.linkedinUrl);
    formData.set("linkedin", data.linkedinUrl);
    formData.set("instagramUrl", data.instagramUrl);
    formData.set("instagram", data.instagramUrl);
    formData.set("contactEmail", data.contactEmail);
    formData.set("primaryColor", data.primaryColor);
    formData.set("secondaryColor", data.secondaryColor);

    setPending(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Request failed.");
        return;
      }

      setResult(json as GenerateResponse);
    } catch {
      setError("Request failed.");
    } finally {
      setPending(false);
    }
  }

  async function onDownloadZip() {
    if (!result) {
      return;
    }

    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: result.brand,
          website: result.website,
          social: result.social,
          blogs: result.blogs,
          branding: result.branding ?? {
            brandName: result.input.startupName,
            primaryColor: result.input.primaryColor,
            secondaryColor: result.input.secondaryColor,
            logoPath: result.uploads?.logo?.path,
            heroImagePath: result.uploads?.heroImage?.path,
          },
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json?.error ?? "Failed to create ZIP.");
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
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Generate</h1>
        <p className="text-sm text-foreground/60">
          Send a request to the API with your startup details.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Startup name</span>
          <input
            required
            name="startupName"
            type="text"
            autoComplete="organization"
            className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none ring-foreground/20 focus:ring-2"
            placeholder="Acme Labs"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Description</span>
          <textarea
            required
            name="description"
            rows={4}
            className="w-full resize-y rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none ring-foreground/20 focus:ring-2"
            placeholder="What you build and who it is for."
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Tone</span>
          <input
            required
            name="tone"
            type="text"
            className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none ring-foreground/20 focus:ring-2"
            placeholder="e.g. confident, friendly, technical"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Logo upload</span>
            <input
              name="logo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setLogoFileName(file ? file.name : null);
              }}
              className="block w-full cursor-pointer rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            <p className="text-xs text-foreground/60">
              {logoFileName ? `Selected: ${logoFileName}` : "No file selected"}
            </p>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">
              Hero image upload (optional)
            </span>
            <input
              name="heroImage"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setHeroFileName(file ? file.name : null);
              }}
              className="block w-full cursor-pointer rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            <p className="text-xs text-foreground/60">
              {heroFileName ? `Selected: ${heroFileName}` : "No file selected"}
            </p>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Twitter</span>
            <input
              name="twitterUrl"
              type="url"
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none ring-foreground/20 focus:ring-2"
              placeholder="https://..."
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">LinkedIn</span>
            <input
              name="linkedinUrl"
              type="url"
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none ring-foreground/20 focus:ring-2"
              placeholder="https://..."
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Instagram</span>
            <input
              name="instagramUrl"
              type="url"
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none ring-foreground/20 focus:ring-2"
              placeholder="https://..."
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Contact Email</span>
            <input
              name="contactEmail"
              type="email"
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none ring-foreground/20 focus:ring-2"
              placeholder="hello@yourstartup.com"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Primary color</span>
            <input
              name="primaryColor"
              type="color"
              defaultValue="#2563eb"
              className="h-11 w-full rounded-lg border border-foreground/15 bg-background p-1"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Secondary color</span>
            <input
              name="secondaryColor"
              type="color"
              defaultValue="#4f46e5"
              className="h-11 w-full rounded-lg border border-foreground/15 bg-background p-1"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Submit"}
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-foreground/15 px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5"
          >
            Back
          </Link>
        </div>
      </form>

      {error ? (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onDownloadZip}
              disabled={downloading}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {downloading ? "Preparing ZIP..." : "Download ZIP"}
            </button>
          </div>

          <section className="space-y-2 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
              Tagline
            </h2>
            <p className="text-base text-foreground">{result.brand.tagline}</p>
          </section>

          <section className="space-y-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
              Website Content
            </h2>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">
                {result.website.hero_title}
              </p>
              <p className="text-sm text-foreground/75">
                {result.website.hero_subtitle}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground/80">Features</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/85">
                {result.website.features.map((feature, index) => {
                  const text =
                    typeof feature === "string"
                      ? feature
                      : [feature.title, feature.description]
                          .filter(Boolean)
                          .join(": ") || "Feature";
                  return <li key={`feature-${index}-${text}`}>{text}</li>;
                })}
              </ul>
            </div>
            <p className="text-sm font-medium text-foreground/90">
              Call to action: {result.website.call_to_action}
            </p>
          </section>

          <section className="space-y-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
              Social Posts
            </h2>
            <ol className="space-y-2 pl-5 text-sm text-foreground/85">
              {result.social.posts.map((post) => (
                <li key={post} className="list-decimal">
                  {post}
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </div>
  );
}
