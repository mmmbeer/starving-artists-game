"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ACKNOWLEDGEMENT_KEY = "starving-artists-cookie-ack-v1";

export default function CookieAcknowledgement() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setVisible(localStorage.getItem(ACKNOWLEDGEMENT_KEY) !== "acknowledged");
      } catch {
        setVisible(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  function acknowledge() {
    try {
      localStorage.setItem(ACKNOWLEDGEMENT_KEY, "acknowledged");
    } catch {
      // The notice can still be dismissed for this page view.
    }
    setVisible(false);
  }

  return (
    <aside className="cookie-acknowledgement" aria-label="Cookie notice">
      <p>
        Starving Artists uses essential cookies and browser storage to keep the
        game working and remember your active games. It does not use advertising
        cookies. <Link href="/privacy#cookies">Privacy details</Link>
      </p>
      <button type="button" onClick={acknowledge}>Acknowledge</button>
    </aside>
  );
}
