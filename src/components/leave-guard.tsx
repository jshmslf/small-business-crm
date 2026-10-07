"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { hasUnsavedChanges } from "@/src/lib/unsaved-changes";

/**
 * Asks "Discard changes?" when an in-app link is clicked while a form has unsaved
 * changes. Next.js has no navigation blocker, so this catches the click itself.
 * Not covered: the browser's Back/Forward buttons and router.push() calls in code.
 */
export function LeaveGuard() {
  const router = useRouter();
  const [pending, setPending] = useState<HTMLAnchorElement | null>(null);
  const bypass = useRef(false);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (bypass.current || e.defaultPrevented) return;
      // Ctrl/Cmd/Shift/middle-click open a new tab or window: nothing is lost
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!hasUnsavedChanges()) return;

      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href);
      // Another site is a full page load, which the beforeunload warning already covers
      if (url.origin !== window.location.origin) return;
      // Same page, only the #hash changes
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      // Stop the click before Next's <Link> handler sees it
      e.preventDefault();
      e.stopPropagation();
      setPending(anchor);
    }

    // Capture phase on window runs before React's own listeners
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  function leave() {
    if (!pending) return;
    bypass.current = true;
    try {
      // Replay the real click so the link does everything it normally does
      // (e.g. the mobile menu closes itself on navigate)
      if (pending.isConnected) pending.click();
      else {
        const url = new URL(pending.href);
        router.push(url.pathname + url.search + url.hash);
      }
    } finally {
      bypass.current = false;
    }
  }

  return (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => { if (!open) setPending(null); }}
      title="Discard changes?"
      description="You have unsaved changes. If you leave now, they'll be lost."
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      destructive
      onConfirm={leave}
    />
  );
}
