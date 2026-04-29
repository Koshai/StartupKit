import archiver from "archiver";
import { PassThrough } from "stream";
import { finished } from "stream/promises";

type ZipInput = {
  websiteHtml: string;
  blog1Markdown: string;
  blog2Markdown: string;
  socialPostsText: string;
  assets?: Array<{
    zipPath: string;
    content: Buffer;
  }>;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function markdownToWordDoc(markdown: string, fallbackTitle: string): string {
  const lines = markdown.split(/\r?\n/);
  const firstHeading = lines.find((line) => line.trim().startsWith("# "));
  const title = firstHeading
    ? firstHeading.replace(/^#\s+/, "").trim()
    : fallbackTitle;

  const htmlBody = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return "<p>&nbsp;</p>";
      }

      const safe = escapeHtml(trimmed)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");

      if (trimmed.startsWith("### ")) return `<h3>${safe.slice(4)}</h3>`;
      if (trimmed.startsWith("## ")) return `<h2>${safe.slice(3)}</h2>`;
      if (trimmed.startsWith("# ")) return `<h1>${safe.slice(2)}</h1>`;
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return `<p>&bull; ${safe.slice(2)}</p>`;
      }
      return `<p>${safe}</p>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin: 1in; }
      h1 { font-size: 24pt; margin: 0 0 12pt; }
      h2 { font-size: 16pt; margin: 14pt 0 8pt; }
      h3 { font-size: 13pt; margin: 12pt 0 6pt; }
      p { margin: 0 0 8pt; }
    </style>
  </head>
  <body>
${htmlBody}
  </body>
</html>`;
}

export async function generateLaunchKitZip({
  websiteHtml,
  blog1Markdown,
  blog2Markdown,
  socialPostsText,
  assets = [],
}: ZipInput): Promise<Buffer> {
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  const streamDone = finished(output);

  output.on("data", (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (error) => {
    throw error;
  });
  archive.pipe(output);

  archive.append(websiteHtml, { name: "website/index.html" });
  archive.append(blog1Markdown, { name: "content/blog1.md" });
  archive.append(blog2Markdown, { name: "content/blog2.md" });
  archive.append(markdownToWordDoc(blog1Markdown, "Blog Post 1"), {
    name: "content/blog1.doc",
  });
  archive.append(markdownToWordDoc(blog2Markdown, "Blog Post 2"), {
    name: "content/blog2.doc",
  });
  archive.append(socialPostsText, { name: "social/posts.txt" });
  for (const asset of assets) {
    archive.append(asset.content, { name: asset.zipPath });
  }
  await archive.finalize();
  await streamDone;

  return Buffer.concat(chunks);
}
