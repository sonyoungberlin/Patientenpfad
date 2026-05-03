/**
 * Phase 3d: Best-effort, in-memory Rate-Limit für den Submit-Pfad
 * `POST /api/p/[slug]/submit`.
 *
 * WICHTIG: Dies ist eine **best-effort**-Schicht, keine harte Sicherheits-
 * garantie. Der Speicher liegt im Prozess-Heap und wird:
 *   - bei Multi-Instance-Deployments nicht geteilt,
 *   - bei jedem Restart geleert,
 *   - kann durch wechselnde IPs / E-Mails umgangen werden.
 *
 * Ein Redis-/DB-basiertes Limit kann später nachgezogen werden, ohne dass
 * sich der Aufrufer-Code ändern muss. Bis dahin reicht diese Schicht, um
 * triviale Spam-Bursts und versehentliche Doppel-Klicks abzufangen.
 *
 * Sliding-Window: pro Bucket-Key werden die Timestamps der letzten Treffer
 * gehalten; Treffer außerhalb des Fensters werden bei jedem Aufruf entsorgt.
 */

type Bucket = { hits: number[] };

export type RateLimitConfig = {
  /** Fensterbreite in ms. */
  windowMs: number;
  /** Maximale Treffer pro Fenster. */
  max: number;
};

/**
 * Default-Konfiguration für `(ip, slug)`-Tupel: 5 Submits / 10 Minuten.
 *
 * Bewusst defensiv konservativ; ehrliche Patienten füllen ein Formular
 * üblicherweise einmal aus.
 */
export const IP_SLUG_RATE_LIMIT: RateLimitConfig = {
  windowMs: 10 * 60 * 1000,
  max: 5,
};

/**
 * Default-Konfiguration für E-Mail-Hash: 3 Submits / 60 Minuten.
 *
 * Verhindert, dass derselbe Empfänger durch unzählige Bestätigungs-Mails
 * geflutet wird.
 */
export const EMAIL_HASH_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000,
  max: 3,
};

/**
 * Erzeugt einen isolierten Rate-Limiter. Pro Aufruf-Kontext (z. B. der
 * Submit-Endpoint) wird üblicherweise ein einzelner Limiter im Modul-Scope
 * gehalten; für Tests kann ein frischer erzeugt werden.
 */
export function createRateLimiter(config: RateLimitConfig) {
  const buckets = new Map<string, Bucket>();

  function check(key: string, now = Date.now()): { allowed: boolean } {
    const cutoff = now - config.windowMs;
    const bucket = buckets.get(key) ?? { hits: [] };
    // Alte Treffer außerhalb des Fensters entsorgen.
    const fresh = bucket.hits.filter((ts) => ts > cutoff);

    if (fresh.length >= config.max) {
      buckets.set(key, { hits: fresh });
      return { allowed: false };
    }

    fresh.push(now);
    buckets.set(key, { hits: fresh });
    return { allowed: true };
  }

  function reset(): void {
    buckets.clear();
  }

  return { check, reset, _buckets: buckets };
}

/**
 * Extrahiert eine möglichst stabile Client-Kennung aus den Request-Headern.
 *
 * `x-forwarded-for` kann manipuliert werden — als best-effort-Limit
 * akzeptabel; siehe Modul-Header.
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
