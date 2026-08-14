import type { ReactNode } from "react";
import { EditorialFooter, EditorialHeader } from "./ArtHistoryShell";

export default function LegalPageShell({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <main className="editorial-page legal-page">
      <EditorialHeader />
      <article className="legal-document">
        <header>
          <p className="editorial-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{summary}</p>
          <small>Effective August 14, 2026</small>
        </header>
        <div className="legal-document-body">{children}</div>
      </article>
      <EditorialFooter />
    </main>
  );
}
