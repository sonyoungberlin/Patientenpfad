"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * ScrollToTop – resets the window scroll position to the top on every
 * client-side route change.  Placed in the root layout so it covers all
 * navigations (router.push, Link, back/forward via Next.js).
 *
 * Must be wrapped in <Suspense> by its parent because it uses a navigation hook.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
