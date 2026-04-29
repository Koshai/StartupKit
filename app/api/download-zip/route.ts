import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { generatePosterHTML, generateWebsiteHTML } from "@/lib/ai";
import { generateQRCode, generateSocialImages, renderPosterAssets } from "@/lib/poster";
import { generateLaunchKitZip } from "@/lib/zip";

type DownloadZipBody = {
  brand?: {
    tagline?: string;
    value_proposition?: string;
  };
  website?: {
    hero_title?: string;
    hero_subtitle?: string;
    features?: Array<string | { title?: string; description?: string }>;
    call_to_action?: string;
  };
  social?: {
    posts?: string[];
  };
  blogs?: {
    blogs?: Array<{
      title?: string;
      content?: string;
    }>;
  };
  branding?: {
    brandName?: string;
    layout?: "centered" | "split";
    website?: string;
    qrUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoPath?: string;
    heroImagePath?: string;
    socials?: {
      twitter?: string;
      linkedin?: string;
      instagram?: string;
      facebook?: string;
    };
    contactEmail?: string;
  };
};

async function readUploadedAsset(
  assetPath: string | undefined,
): Promise<{
  zipPath: string;
  content: Buffer;
  htmlSrc: string;
  fileName: string;
  dataUrl: string;
} | null> {
  if (!assetPath || !assetPath.startsWith("/uploads/")) {
    return null;
  }

  const fileName = path.basename(assetPath);
  const sourcePath = path.join(process.cwd(), "public", "uploads", fileName);
  const content = await readFile(sourcePath);
  const mimeType = getMimeTypeFromName(fileName);
  return {
    zipPath: `website/assets/${fileName}`,
    content,
    htmlSrc: `assets/${fileName}`,
    fileName,
    dataUrl: `data:${mimeType};base64,${content.toString("base64")}`,
  };
}

function getMimeTypeFromName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

async function buildWebsiteHtmlAndAssets(body: DownloadZipBody): Promise<{
  html: string;
  assets: Array<{ zipPath: string; content: Buffer }>;
}> {
  const website = body.website;
  if (!website) {
    return {
      html: "<!DOCTYPE html><html><body><p>Website content is missing.</p></body></html>",
      assets: [],
    };
  }

  const normalizedFeatures = (website.features ?? []).map((feature) => {
    if (typeof feature === "string") {
      const [title, ...rest] = feature.split(":");
      return {
        title: title.trim() || "Feature",
        description: (rest.join(":").trim() || feature).trim(),
      };
    }
    return {
      title: feature.title?.trim() || "Feature",
      description: feature.description?.trim() || "No description provided.",
    };
  });

  const logoAsset = await readUploadedAsset(body.branding?.logoPath);
  const heroAsset = await readUploadedAsset(body.branding?.heroImagePath);
  const html = generateWebsiteHTML(
    {
      hero_title: website.hero_title ?? "Website",
      hero_subtitle: website.hero_subtitle ?? "",
      features: normalizedFeatures,
      call_to_action: website.call_to_action ?? "",
    },
    {
      brandName: body.branding?.brandName?.trim() || website.hero_title || "Brand",
      layout: body.branding?.layout,
      primaryColor: body.branding?.primaryColor,
      secondaryColor: body.branding?.secondaryColor,
      accentColor: body.branding?.accentColor,
      logo: logoAsset?.dataUrl ?? logoAsset?.htmlSrc,
      heroImage: heroAsset?.dataUrl ?? heroAsset?.htmlSrc,
      socials: body.branding?.socials,
      contactEmail: body.branding?.contactEmail,
    },
  );

  const assets = [logoAsset, heroAsset]
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map(({ zipPath, content }) => ({ zipPath, content }));
  return { html, assets };
}

function buildSocialText(body: DownloadZipBody): string {
  const posts = body.social?.posts ?? [];
  if (posts.length === 0) {
    return "Social posts are missing.";
  }

  return posts.map((post, index) => `${index + 1}. ${post}`).join("\n");
}

function buildBlogMarkdown(
  body: DownloadZipBody,
  index: number,
  fallbackTitle: string,
): string {
  const blog = body.blogs?.blogs?.[index];
  if (!blog) {
    return `# ${fallbackTitle}\n\nBlog content is missing.`;
  }

  const title = blog.title?.trim() || fallbackTitle;
  const content = blog.content?.trim() || "Blog content is missing.";
  return `# ${title}\n\n${content}`;
}

export async function POST(request: Request) {
  let body: DownloadZipBody;
  try {
    body = (await request.json()) as DownloadZipBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const websiteBundle = await buildWebsiteHtmlAndAssets(body);
    const posterLogoAsset = await readUploadedAsset(body.branding?.logoPath);
    const posterLogoDataUrl = posterLogoAsset
      ? `data:${getMimeTypeFromName(posterLogoAsset.fileName)};base64,${posterLogoAsset.content.toString("base64")}`
      : undefined;
    const qrTargetUrl =
      body.branding?.qrUrl?.trim() ||
      body.branding?.website?.trim() ||
      body.branding?.socials?.instagram?.trim() ||
      body.branding?.socials?.facebook?.trim() ||
      "https://example.com";
    const qrCodeDataUrl = await generateQRCode(qrTargetUrl);
    const benefits = (body.website?.features ?? [])
      .map((feature) =>
        typeof feature === "string"
          ? feature
          : `${feature.title ?? ""} ${feature.description ?? ""}`.trim(),
      )
      .filter(Boolean)
      .slice(0, 2);
    const posterHtml = generatePosterHTML("promo", {
      brandName: body.branding?.brandName?.trim() || body.website?.hero_title || "Brand",
      tagline: body.brand?.tagline?.trim() || body.website?.hero_subtitle || "",
      value_proposition: body.brand?.value_proposition?.trim() || "",
      call_to_action: body.website?.call_to_action?.trim() || "Get Started",
      primaryColor: body.branding?.primaryColor?.trim() || "#4F46E5",
      secondaryColor: body.branding?.secondaryColor?.trim() || "#9333EA",
      logo: posterLogoDataUrl,
      qrCodeDataUrl,
      benefits,
    });
    const posterAssets = await renderPosterAssets(posterHtml);
    const socialImages = await generateSocialImages({
      brandName: body.branding?.brandName?.trim() || body.website?.hero_title || "Brand",
      tagline: body.brand?.tagline?.trim() || body.website?.hero_subtitle || "",
      value_proposition: body.brand?.value_proposition?.trim() || "",
      call_to_action: body.website?.call_to_action?.trim() || "Get Started",
      primaryColor: body.branding?.primaryColor?.trim() || "#4F46E5",
      secondaryColor: body.branding?.secondaryColor?.trim() || "#9333EA",
      logo: posterLogoDataUrl,
    });

    const zipBuffer = await generateLaunchKitZip({
      websiteHtml: websiteBundle.html,
      blog1Markdown: buildBlogMarkdown(body, 0, "Blog Post 1"),
      blog2Markdown: buildBlogMarkdown(body, 1, "Blog Post 2"),
      socialPostsText: buildSocialText(body),
      assets: [
        ...websiteBundle.assets,
        { zipPath: "assets/poster.png", content: posterAssets.pngBuffer },
        { zipPath: "assets/poster.pdf", content: posterAssets.pdfBuffer },
        { zipPath: "assets/social/instagram.png", content: socialImages.instagram },
        { zipPath: "assets/social/twitter.png", content: socialImages.twitter },
        { zipPath: "assets/social/facebook.png", content: socialImages.facebook },
      ],
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="launch-kit.zip"',
      },
    });
  } catch (error) {
    console.error("[api/download-zip] failed:", error);
    return NextResponse.json({ error: "Failed to create ZIP." }, { status: 500 });
  }
}
