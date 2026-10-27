"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ui/ConnectButton";
import NetworkBadge from "@/components/botchain/NetworkBadge";
import { footerLinks } from "@/lib/botchain/chain";
import BuiltOnBotChain from "@/components/botchain/BuiltOnBotChain";
import FloatingAction from "@/components/punchcard/FloatingAction";
import { app } from "@/lib/app-config";

export type NavItem = { href: string; label: string };

const DEFAULT_NAV: NavItem[] = [
  { href: "/", label: "Wallet of Cards" },
  { href: "/new", label: "New Programme" },
  { href: "/me", label: "Earnings & Balance" },
];

interface PageShellProps {
  children: React.ReactNode;
  nav?: NavItem[];
  title?: string;
  description?: string;
  showFloatingAction?: boolean;
}

export default function PageShell({
  children,
  nav = DEFAULT_NAV,
  title,
  description,
  showFloatingAction = true,
}: PageShellProps) {
  const links = footerLinks();
  const pathname = usePathname();

  return (
    <div
      className="flex flex-col overflow-x-hidden min-h-[100dvh] bg-[var(--bg-base)] text-[var(--text-primary)]"
    >
      <header
        className="sticky top-0 z-30 flex-shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      >
        <div className="mx-auto w-full max-w-[880px] px-4 md:px-6">
          <div className="flex items-center gap-3 py-3">
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 no-underline">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 bg-[var(--accent)] shadow-xs"
                aria-hidden="true"
              />
              <span className="text-[17px] font-bold font-heading tracking-tight text-[var(--text-primary)]">
                {app.name}
              </span>
            </Link>

            <div className="flex-1" />
            <NetworkBadge />
            <div className="w-[150px] md:w-[180px] flex-shrink-0">
              <ConnectButton />
            </div>
          </div>

          {nav.length > 0 && <Nav items={nav} />}
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[880px] px-4 py-6 md:px-6 md:py-8">
        {(title || description) && (
          <div className="mb-6">
            {title && (
              <h1 className="text-[22px] md:text-[26px] font-bold font-heading tracking-tight text-[var(--text-primary)]">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </main>

      {/* Required BOT Chain 3-link Ecosystem Footer */}
      <footer
        className="flex-shrink-0 mx-auto w-full max-w-[880px] px-4 py-6 md:px-6 border-t border-[var(--border-subtle)]"
      >
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-[var(--text-muted)]">
            {app.tagline}
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block w-2 h-2 rounded-xs bg-[var(--accent)] flex-shrink-0"
              />
              <BuiltOnBotChain
                className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]"
              />
            </span>

            <a
              href={links.site}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] underline text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              botchain.ai
            </a>

            <a
              href={links.explorer}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] underline text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              BOT Chain Explorer
            </a>
          </div>
        </div>
      </footer>

      {showFloatingAction && pathname !== "/new" && <FloatingAction />}
    </div>
  );
}

function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 -mb-px overflow-x-auto" aria-label="Main Navigation">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`
              nav-link flex items-center px-3.5 py-2 text-[13px] font-heading font-semibold tracking-wide no-underline whitespace-nowrap transition-colors
              ${
                active
                  ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-b-2 border-transparent"
              }
            `}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
