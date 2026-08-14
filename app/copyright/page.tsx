import type { Metadata } from "next";
import LegalPageShell from "../components/LegalPageShell";

export const metadata: Metadata = {
  title: "Copyright and Takedown Policy",
  description: "How to submit a copyright takedown notice or counter-notice to Turnip Games, LLC.",
  alternates: { canonical: "/copyright" },
};

export default function CopyrightPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Copyright and Takedown Policy"
      summary="Turnip Games, LLC respects copyright. This page explains how to report material you believe infringes your rights."
    >
      <section>
        <h2>Send a takedown notice</h2>
        <p>Email a written notice to <a href="mailto:legal@tourn.app">legal@tourn.app</a> with the subject “Copyright Takedown Notice.” Include:</p>
        <ol>
          <li>Your physical or electronic signature.</li>
          <li>Identification of the copyrighted work, or a representative list if several works are involved.</li>
          <li>Identification of the material you believe is infringing and enough information, such as a specific URL, for us to locate it.</li>
          <li>Your name, mailing address, telephone number and email address.</li>
          <li>A statement that you have a good-faith belief that the disputed use is not authorized by the copyright owner, its agent or the law.</li>
          <li>A statement that the notice is accurate and, under penalty of perjury, that you are the copyright owner or authorized to act for the owner.</li>
        </ol>
        <p>We may send the notice to the person responsible for the material. We may remove or disable access to material while we review the claim.</p>
      </section>

      <section>
        <h2>Send a counter-notice</h2>
        <p>If material you supplied was removed because of a copyright notice and you believe that happened through mistake or misidentification, email <a href="mailto:legal@tourn.app">legal@tourn.app</a> with the subject “Copyright Counter-Notice.” Include:</p>
        <ol>
          <li>Your physical or electronic signature.</li>
          <li>Identification of the removed material and the location where it appeared.</li>
          <li>A statement under penalty of perjury that you have a good-faith belief the material was removed or disabled because of mistake or misidentification.</li>
          <li>Your name, address and telephone number.</li>
          <li>A statement consenting to the jurisdiction of the appropriate U.S. federal district court and agreeing to accept service of process from the person who sent the original notice or that person’s agent.</li>
        </ol>
        <p>We may restore eligible material after the waiting period required by law unless the original claimant tells us that a court action has been filed.</p>
      </section>

      <section>
        <h2>Repeat infringement and false claims</h2>
        <p>We may restrict access for repeat infringement. Knowingly making a material misrepresentation in a notice or counter-notice may create legal liability.</p>
      </section>

      <section>
        <h2>Official guidance</h2>
        <p>The <a href="https://www.copyright.gov/512/" rel="noreferrer" target="_blank">U.S. Copyright Office Section 512 resource</a> explains the federal notice-and-takedown process and provides sample notices.</p>
      </section>
    </LegalPageShell>
  );
}
