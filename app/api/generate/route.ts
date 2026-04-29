import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  generatePosterHTML,
  generateCTA,
  generateBlogs,
  generateBrand,
  generateSocial,
  generateWebsite,
  generateWebsiteHTML,
} from "@/lib/ai";
import { generateQRCode } from "@/lib/poster";

type UploadedAsset = {
  fileName: string;
  path: string;
  mimeType: string;
  size: number;
};

type RegenerateMode = "website" | "poster" | "social" | "blog";

function readJsonField<T>(form: FormData, field: string): T | undefined {
  const raw = form.get(field);
  if (typeof raw !== "string" || !raw.trim()) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

async function saveUploadedImage(file: File, prefix: string) {
  if (!file || file.size === 0) {
    return null;
  }
  if (!file.type.startsWith("image/")) {
    throw new Error(`${prefix} must be an image file.`);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const relativePath = `/uploads/${fileName}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const fullPath = path.join(uploadDir, fileName);

  await mkdir(uploadDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(fullPath, Buffer.from(bytes));

  const uploaded: UploadedAsset = {
    fileName: file.name,
    path: relativePath,
    mimeType: file.type,
    size: file.size,
  };
  return uploaded;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart/form-data payload." },
      { status: 400 },
    );
  }

  const startupName = String(form.get("startupName") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const tone = String(form.get("tone") ?? "").trim();
  const businessType = String(form.get("businessType") ?? "").trim();
  const layout = String(form.get("layout") ?? "centered").trim();
  const twitter = String(form.get("twitter") ?? form.get("twitterUrl") ?? "").trim();
  const linkedin = String(form.get("linkedin") ?? form.get("linkedinUrl") ?? "").trim();
  const instagram = String(form.get("instagram") ?? form.get("instagramUrl") ?? "").trim();
  const facebook = String(form.get("facebook") ?? form.get("facebookUrl") ?? "").trim();
  const contactEmail = String(form.get("contactEmail") ?? "").trim();
  const primaryColor = String(form.get("primaryColor") ?? "").trim();
  const secondaryColor = String(form.get("secondaryColor") ?? "").trim();
  const accentColor = String(form.get("accentColor") ?? "").trim();
  const qrUrl = String(form.get("qrUrl") ?? "").trim();
  const regenerate = String(form.get("regenerate") ?? "").trim() as RegenerateMode | "";

  if (!startupName || !description || !tone) {
    return NextResponse.json(
      {
        error: "startupName, description, and tone are required.",
      },
      { status: 400 },
    );
  }

  try {
    const logoFile = form.get("logo");
    const heroImageFile = form.get("heroImage");
    const logo =
      logoFile instanceof File ? await saveUploadedImage(logoFile, "logo") : null;
    const heroImage =
      heroImageFile instanceof File
        ? await saveUploadedImage(heroImageFile, "heroImage")
        : null;

    console.log("[api/generate] input:", {
      startupName,
      description,
      tone,
      businessType,
      layout,
      twitter,
      linkedin,
      instagram,
      facebook,
      contactEmail,
      primaryColor,
      secondaryColor,
      accentColor,
      qrUrl,
      logo: logo?.path ?? null,
      heroImage: heroImage?.path ?? null,
    });

    const existingBrand = readJsonField<Record<string, unknown>>(form, "brand");
    const existingWebsite = readJsonField<Record<string, unknown>>(form, "website");
    const existingSocial = readJsonField<Record<string, unknown>>(form, "social");
    const existingBlogs = readJsonField<Record<string, unknown>>(form, "blogs");
    const existingBranding =
      readJsonField<Record<string, unknown>>(form, "branding") ?? {};

    const branding = {
      ...(existingBranding ?? {}),
      brandName: startupName,
      primaryColor,
      secondaryColor,
      accentColor,
      qrUrl,
      logoPath: logo?.path ?? (existingBranding?.logoPath as string | undefined),
      heroImagePath:
        heroImage?.path ?? (existingBranding?.heroImagePath as string | undefined),
      socials: {
        ...((existingBranding?.socials as Record<string, unknown>) ?? {}),
        twitter,
        linkedin,
        instagram,
        facebook,
      },
      contactEmail,
      layout,
    };

    if (regenerate) {
      if (regenerate === "website") {
        if (!existingBrand) {
          return NextResponse.json(
            { error: "brand is required for regenerate=website" },
            { status: 400 },
          );
        }
        const websiteRaw = await generateWebsite(existingBrand as never);
        const website = {
          ...websiteRaw,
          call_to_action: generateCTA(description, businessType),
        };
        const websiteHtml = generateWebsiteHTML(website, {
          brandName: startupName,
          layout: layout === "split" ? "split" : "centered",
          logo: (branding.logoPath as string | undefined) || undefined,
          heroImage: (branding.heroImagePath as string | undefined) || undefined,
          primaryColor,
          secondaryColor,
          accentColor,
          socials: (branding.socials as
            | {
                twitter?: string;
                linkedin?: string;
                instagram?: string;
                facebook?: string;
              }
            | undefined),
          contactEmail,
        });
        return NextResponse.json({
          ok: true,
          regenerate,
          input: {
            startupName,
            description,
            tone,
            businessType,
            layout,
            primaryColor,
            secondaryColor,
            accentColor,
          },
          uploads: { logo, heroImage },
          branding,
          brand: existingBrand,
          website,
          websiteHtml,
          social: existingSocial ?? null,
          blogs: existingBlogs ?? null,
        });
      }

      if (regenerate === "social") {
        if (!existingBrand) {
          return NextResponse.json(
            { error: "brand is required for regenerate=social" },
            { status: 400 },
          );
        }
        const social = await generateSocial(existingBrand as never);
        return NextResponse.json({
          ok: true,
          regenerate,
          input: {
            startupName,
            description,
            tone,
            businessType,
            layout,
            primaryColor,
            secondaryColor,
          },
          uploads: { logo, heroImage },
          branding,
          brand: existingBrand,
          website: existingWebsite ?? null,
          social,
          blogs: existingBlogs ?? null,
        });
      }

      if (regenerate === "blog") {
        if (!existingBrand) {
          return NextResponse.json(
            { error: "brand is required for regenerate=blog" },
            { status: 400 },
          );
        }
        const blogs = await generateBlogs(existingBrand as never);
        return NextResponse.json({
          ok: true,
          regenerate,
          input: {
            startupName,
            description,
            tone,
            businessType,
            layout,
            primaryColor,
            secondaryColor,
          },
          uploads: { logo, heroImage },
          branding,
          brand: existingBrand,
          website: existingWebsite ?? null,
          social: existingSocial ?? null,
          blogs,
        });
      }

      if (regenerate === "poster") {
        const posterBrand = (existingBrand ?? {}) as {
          tagline?: string;
          value_proposition?: string;
        };
        const posterWebsite = (existingWebsite ?? {}) as {
          hero_subtitle?: string;
          call_to_action?: string;
          features?: Array<string | { title?: string; description?: string }>;
        };
        const qrTargetUrl =
          qrUrl ||
          (branding as { qrUrl?: string })?.qrUrl?.trim() ||
          (branding as { website?: string })?.website?.trim() ||
          (branding as { socials?: { instagram?: string } })?.socials?.instagram?.trim() ||
          "https://example.com";
        const qrCodeDataUrl = await generateQRCode(qrTargetUrl);
        const benefits = (posterWebsite.features ?? [])
          .map((feature) =>
            typeof feature === "string"
              ? feature
              : `${feature.title ?? ""} ${feature.description ?? ""}`.trim(),
          )
          .filter(Boolean)
          .slice(0, 2);
        const posterHtml = generatePosterHTML("promo", {
          brandName: startupName,
          tagline: posterBrand.tagline?.trim() || posterWebsite.hero_subtitle || "",
          value_proposition: posterBrand.value_proposition?.trim() || "",
          call_to_action:
            posterWebsite.call_to_action?.trim() || generateCTA(description, businessType),
          primaryColor: primaryColor || "#4F46E5",
          secondaryColor: secondaryColor || "#9333EA",
          qrCodeDataUrl,
          benefits,
        });
        return NextResponse.json({
          ok: true,
          regenerate,
          input: {
            startupName,
            description,
            tone,
            businessType,
            layout,
            primaryColor,
            secondaryColor,
          },
          uploads: { logo, heroImage },
          branding,
          brand: existingBrand ?? null,
          website: existingWebsite ?? null,
          social: existingSocial ?? null,
          blogs: existingBlogs ?? null,
          poster: { html: posterHtml },
        });
      }
    }

    const brand = await generateBrand({ startupName, description, tone });
    const websiteRaw = await generateWebsite(brand);
    const website = {
      ...websiteRaw,
      call_to_action: generateCTA(description, businessType),
    };
    const websiteHtml = generateWebsiteHTML(website, {
      brandName: startupName,
      layout: layout === "split" ? "split" : "centered",
      logo: logo?.path ?? undefined,
      heroImage: heroImage?.path ?? undefined,
      primaryColor,
      secondaryColor,
      accentColor,
      socials: { twitter, linkedin, instagram, facebook },
      contactEmail,
    });
    const social = await generateSocial(brand);
    const blogs = await generateBlogs(brand);
    const fullQrTargetUrl =
      qrUrl ||
      branding.qrUrl?.trim() ||
      (branding as { website?: string }).website?.trim() ||
      branding.socials?.instagram?.trim() ||
      "https://example.com";
    const fullQrCodeDataUrl = await generateQRCode(fullQrTargetUrl);
    const fullBenefits = (website.features ?? [])
      .map((feature) =>
        typeof feature === "string"
          ? feature
          : `${feature.title ?? ""} ${feature.description ?? ""}`.trim(),
      )
      .filter(Boolean)
      .slice(0, 2);
    const posterHtml = generatePosterHTML("promo", {
      brandName: startupName,
      tagline: brand.tagline?.trim() || website.hero_subtitle || "",
      value_proposition: brand.value_proposition?.trim() || "",
      call_to_action: website.call_to_action?.trim() || generateCTA(description, businessType),
      primaryColor: primaryColor || "#4F46E5",
      secondaryColor: secondaryColor || "#9333EA",
      qrCodeDataUrl: fullQrCodeDataUrl,
      benefits: fullBenefits,
    });

    return NextResponse.json({
      ok: true,
      input: {
        startupName,
        description,
        tone,
        businessType,
        layout,
        primaryColor,
        secondaryColor,
        accentColor,
      },
      uploads: { logo, heroImage },
      branding,
      brand,
      website,
      websiteHtml,
      poster: { html: posterHtml },
      social,
      blogs,
    });
  } catch (error) {
    console.error("[api/generate] generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate content." },
      { status: 500 },
    );
  }

}
