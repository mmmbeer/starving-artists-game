import Link from "next/link";

export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`legal-links ${className}`}>
      <span>© 2026 Turnip Games, LLC</span>
      <nav aria-label="Legal information">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/copyright">Copyright</Link>
        <a href="mailto:legal@tourn.app">legal@tourn.app</a>
      </nav>
    </div>
  );
}
