import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "../components/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using the Starving Artists online game operated by Turnip Games, LLC.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Terms of Service"
      summary="These terms govern your use of the Starving Artists website and online game operated by Turnip Games, LLC."
    >
      <section>
        <h2>1. Agreement</h2>
        <p>By using Starving Artists, you agree to these Terms of Service and our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the service. If you cannot legally agree on your own, a parent or guardian must agree for you.</p>
      </section>

      <section>
        <h2>2. The service</h2>
        <p>Starving Artists is a browser-based strategy game. Features may change, pause or end. We may correct game state, remove abandoned games or limit access when needed to protect the service or other players.</p>
      </section>

      <section>
        <h2>3. Your conduct</h2>
        <p>You may not use the service to break the law, harass others, interfere with normal operation, probe security, automate abusive requests, impersonate another person or submit content that infringes another person’s rights.</p>
        <p>Player names and studio names must be suitable for a shared game. We may remove content or restrict access when reasonably necessary.</p>
      </section>

      <section>
        <h2>4. Game access and data</h2>
        <p>Game links, player tokens and curator credentials are access keys. Keep them private. You are responsible for activity performed through credentials stored on your device.</p>
        <p>Games are temporary. Do not rely on the service as permanent storage. Details about data and browser storage appear in our <Link href="/privacy">Privacy Policy</Link>.</p>
      </section>

      <section>
        <h2>5. Intellectual property</h2>
        <p>Except for public-domain works and third-party materials, the site software, text, graphics and presentation are owned by or licensed to Turnip Games, LLC. These terms do not transfer ownership to you.</p>
        <p>Public-domain artwork remains public domain. Museum names, artist records, linked sources and other third-party materials belong to their respective owners where applicable.</p>
      </section>

      <section>
        <h2>6. Copyright complaints</h2>
        <p>Our <Link href="/copyright">Copyright Policy</Link> explains how to send a takedown notice or counter-notice. Send copyright correspondence to <a href="mailto:legal@tourn.app">legal@tourn.app</a>.</p>
      </section>

      <section>
        <h2>7. No warranties</h2>
        <p>The service is provided “as is” and “as available.” To the fullest extent allowed by law, Turnip Games, LLC disclaims implied warranties, including merchantability, fitness for a particular purpose and non-infringement. We do not promise uninterrupted operation or error-free game results.</p>
      </section>

      <section>
        <h2>8. Limits on liability</h2>
        <p>To the fullest extent allowed by law, Turnip Games, LLC will not be liable for indirect, incidental, special, consequential or punitive damages, lost data, lost profits or loss of access arising from the service.</p>
        <p>Our total liability for a claim relating to the service will not exceed the greater of the amount you paid us for the service during the prior twelve months or US $100. Some laws do not allow certain limits, so those limits apply only where permitted.</p>
      </section>

      <section>
        <h2>9. Governing law</h2>
        <p>Wisconsin law governs these terms without regard to conflict-of-law rules. Any dispute that must be heard in court will be brought in a state or federal court located in Dane County, Wisconsin, unless applicable law requires another location.</p>
      </section>

      <section>
        <h2>10. Changes and contact</h2>
        <p>We may update these terms. The effective date will show when the current version began. Continued use after an update means you accept the revised terms.</p>
        <p>Questions may be sent to Turnip Games, LLC at <a href="mailto:legal@tourn.app">legal@tourn.app</a>.</p>
      </section>
    </LegalPageShell>
  );
}
