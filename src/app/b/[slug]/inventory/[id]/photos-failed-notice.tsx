"use client";

import { useEffect } from "react";
import { Notice } from "@/src/components/form-field";

// Shown after a save where some photos failed. Drops ?photos=failed from the URL
// (without re-fetching the page) so a refresh doesn't show it again.
export function PhotosFailedNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("photos");
    window.history.replaceState(null, "", url);
  }, []);

  return (
    <Notice tone="warning" className="max-w-3xl">
      The item was saved, but some photos didn&apos;t upload. You can add them below.
    </Notice>
  );
}
