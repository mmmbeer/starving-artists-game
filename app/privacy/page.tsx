import type { Metadata } from "next";
import LegalPageShell from "../components/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Turnip Games, LLC handles information for the Starving Artists online game.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      summary="This policy explains how Turnip Games, LLC handles information when you visit or play Starving Artists."
    >
      <section>
        <h2>1. Information we handle</h2>
        <p>When you create or join a game, we process the studio name, player display name, selected avatar, game code, game actions and current game state. The service also creates player credentials used to reconnect your browser to an active game.</p>
        <p>Our hosting and security systems may process basic technical information such as request time, IP address, browser information, error details and rate-limit activity.</p>
      </section>

      <section>
        <h2>2. How we use information</h2>
        <ul>
          <li>Run and synchronize multiplayer games.</li>
          <li>Reconnect players to active games.</li>
          <li>Protect the service, prevent abuse and diagnose failures.</li>
          <li>Respond to support, legal and copyright requests.</li>
        </ul>
      </section>

      <section id="cookies">
        <h2>3. Cookies and browser storage</h2>
        <p>Ordinary play stores active-game credentials and recent-game details in your browser. The cookie acknowledgement is also stored locally so the notice does not appear every visit.</p>
        <p>An essential, secure session cookie is used for authorized curator access. It lasts up to twelve hours. The service does not use advertising cookies or sell information for targeted advertising.</p>
        <p>You can clear local game information through your browser’s site-data controls. Doing so may prevent you from reconnecting to a game from that device.</p>
      </section>

      <section>
        <h2>4. Sharing</h2>
        <p>We may share information with service providers that host, secure or support the application. We may also disclose information when required by law, to protect rights or safety, or as part of a merger, financing, sale or transfer of the service.</p>
        <p>We do not sell personal information.</p>
      </section>

      <section>
        <h2>5. Retention</h2>
        <p>Active game records are designed to expire after fourteen days without activity. Security logs and operational records may be retained longer when reasonably needed for reliability, fraud prevention or legal obligations. Browser storage remains on your device until it expires or you clear it.</p>
      </section>

      <section>
        <h2>6. Choices and requests</h2>
        <p>You may ask about, correct or request deletion of information linked to you. Because the game does not require a player account, we may need a game code, display name and other details to locate a record and verify the request.</p>
        <p>Send privacy requests to Turnip Games, LLC at <a href="mailto:legal@tourn.app">legal@tourn.app</a>.</p>
      </section>

      <section>
        <h2>7. Children</h2>
        <p>The service is not designed to collect personal information from children. Children should use the game with a parent, guardian or responsible adult and should not use a real name as a display name.</p>
      </section>

      <section>
        <h2>8. Security and changes</h2>
        <p>We use reasonable technical and organizational safeguards. No online service can guarantee complete security. We may update this policy as the service changes and will revise the effective date when we do.</p>
      </section>
    </LegalPageShell>
  );
}
