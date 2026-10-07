import { useEffect } from "react";

// Forms that currently have unsaved changes (read by LeaveGuard on link clicks)
const dirtyForms = new Set<symbol>();

/** True while any mounted form has unsaved changes. */
export function hasUnsavedChanges() {
  return dirtyForms.size > 0;
}

/** True if any field differs from where the form started. */
export function hasChanges<T extends object>(current: T, initial: T) {
  return (Object.keys(current) as (keyof T)[]).some((key) => current[key] !== initial[key]);
}

/**
 * While `isDirty`: shows the browser's "Leave site?" warning on refresh / tab close,
 * and makes in-app link clicks ask "Discard changes?" (see LeaveGuard).
 */
export function useWarnOnLeave(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const form = Symbol();
    dirtyForms.add(form);

    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => {
      dirtyForms.delete(form);
      window.removeEventListener("beforeunload", warn);
    };
  }, [isDirty]);
}
