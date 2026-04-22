import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { generateWebsiteHTML } from "@/lib/ai";
import { generateLaunchKitZip } from "@/lib/zip";

type DownloadZipBody = {
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
    primaryColor?: string;
    secondaryColor?: string;
    logoPath?: string;
    heroImagePath?: string;
  };
};

async function readUploadedAsset(
  assetPath: string | undefined,
): Promise<{ zipPath: string; content: Buffer; htmlSrc: string } | null> {
  if (!assetPath || !assetPath.startsWith("/uploads/")) {
    return null;
  }

  const fileName = path.basename(assetPath);
  const sourcePath = path.join(process.cwd(), "public", "uploads", fileName);
  const content = await readFile(sourcePath);
  return {
    zipPath: `website/assets/${fileName}`,
    content,
    htmlSrc: `assets/${fileName}`,
  };
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
      primaryColor: body.branding?.primaryColor,
      secondaryColor: body.branding?.secondaryColor,
      logo: logoAsset?.htmlSrc,
      heroImage: heroAsset?.htmlSrc,
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
    const zipBuffer = await generateLaunchKitZip({
      websiteHtml: websiteBundle.html,
      blog1Markdown: buildBlogMarkdown(body, 0, "Blog Post 1"),
      blog2Markdown: buildBlogMarkdown(body, 1, "Blog Post 2"),
      socialPostsText: buildSocialText(body),
      assets: websiteBundle.assets,
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
