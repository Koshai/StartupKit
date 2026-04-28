import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  generateBlogs,
  generateBrand,
  generateSocial,
  generateWebsite,
} from "@/lib/ai";

type UploadedAsset = {
  fileName: string;
  path: string;
  mimeType: string;
  size: number;
};

function normalizeCallToAction(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const banned = new Set([
    "learn more",
    "read more",
    "click here",
    "discover more",
  ]);
  if (!cleaned) {
    return "Get Started";
  }

  const lower = cleaned.toLowerCase();
  if (banned.has(lower)) {
    return "Get Started";
  }

  const words = cleaned.split(" ");
  if (words.length < 2) {
    return "Get Started";
  }
  if (words.length > 4) {
    return words.slice(0, 4).join(" ");
  }
  return cleaned;
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
  const twitter = String(form.get("twitter") ?? form.get("twitterUrl") ?? "").trim();
  const linkedin = String(form.get("linkedin") ?? form.get("linkedinUrl") ?? "").trim();
  const instagram = String(form.get("instagram") ?? form.get("instagramUrl") ?? "").trim();
  const contactEmail = String(form.get("contactEmail") ?? "").trim();
  const primaryColor = String(form.get("primaryColor") ?? "").trim();
  const secondaryColor = String(form.get("secondaryColor") ?? "").trim();

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
      twitter,
      linkedin,
      instagram,
      contactEmail,
      primaryColor,
      secondaryColor,
      logo: logo?.path ?? null,
      heroImage: heroImage?.path ?? null,
    });

    const brand = await generateBrand({ startupName, description, tone });
    const websiteRaw = await generateWebsite(brand);
    const website = {
      ...websiteRaw,
      call_to_action: normalizeCallToAction(websiteRaw.call_to_action),
    };
    const social = await generateSocial(brand);
    const blogs = await generateBlogs(brand);

    const branding = {
      brandName: startupName,
      primaryColor,
      secondaryColor,
      logoPath: logo?.path ?? undefined,
      heroImagePath: heroImage?.path ?? undefined,
      socials: {
        twitter,
        linkedin,
        instagram,
      },
      contactEmail,
    };

    return NextResponse.json({
      ok: true,
      input: { startupName, description, tone, primaryColor, secondaryColor },
      uploads: { logo, heroImage },
      branding,
      brand,
      website,
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
