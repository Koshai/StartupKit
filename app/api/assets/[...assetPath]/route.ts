import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

function getContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetPath: string[] }> },
) {
  try {
    const params = await context.params;
    const parts = params.assetPath ?? [];
    if (parts.length === 0) {
      return NextResponse.json({ error: "Missing asset path." }, { status: 400 });
    }

    // Prevent path traversal and only allow files under ./assets.
    if (parts.some((part) => part.includes("..") || part.includes("\\") || part === "")) {
      return NextResponse.json({ error: "Invalid asset path." }, { status: 400 });
    }

    const assetsDir = path.join(process.cwd(), "assets");
    const filePath = path.join(assetsDir, ...parts);
    const buffer = await readFile(filePath);
    const fileName = parts[parts.length - 1] ?? "file";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": getContentType(fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
}
