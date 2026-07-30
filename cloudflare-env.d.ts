import type {} from "@cloudflare/workers-types";

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      ADMIN_PASSWORD?: string;
      CURATOR_SESSION_SECRET?: string;
    }
  }
}
