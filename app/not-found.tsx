import Link from "next/link";
import PageShell from "@/components/layout/PageShell";

export default function NotFound() {
  return (
    <PageShell title="Page Not Found" description="The requested card or page does not exist.">
      <div className="w-full max-w-xl mx-auto my-12 text-center p-8 rounded-2xl border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--bg-elevated)] border-2 border-[var(--border-default)] flex items-center justify-center text-[var(--accent)]">
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h3 className="font-heading text-xl font-bold text-[var(--text-primary)]">
          Card or Page Not Found
        </h3>

        <p className="text-[13px] text-[var(--text-muted)] max-w-sm mx-auto">
          We couldn&apos;t find the loyalty programme or page you were looking for.
        </p>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl font-heading font-bold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 active:scale-95 transition-all shadow-md no-underline"
          >
            Return to Wallet
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
