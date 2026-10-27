"use client";

import PageShell from "@/components/layout/PageShell";
import LimitationBlock from "@/components/punchcard/LimitationBlock";
import CardStack from "@/components/punchcard/CardStack";
import { app } from "@/lib/app-config";

export default function Home() {
  return (
    <PageShell title={app.name} description={app.tagline}>
      <div className="flex flex-col gap-6">
        <LimitationBlock />
        <CardStack programs={[]} cards={{}} />
      </div>
    </PageShell>
  );
}
