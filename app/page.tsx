import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex max-w-md flex-col items-center gap-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Launch Kit Generator
          </h1>
          <p className="text-sm text-foreground/60">
            Describe your startup and we will draft positioning you can refine.
          </p>
        </div>
        <Link
          href="/generate"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Generate Launch Kit
        </Link>
      </div>
    </div>
  );
}
