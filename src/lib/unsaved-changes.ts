import { useEffect } from "react";

/** True if any field differs from where the form started. */
export function hasChanges<T extends object>(current: T, initial: T) {
  return (Object.keys(current) as (keyof T)[]).some((key) => current[key] !== initial[key]);
}

/** Browser's "Leave site?" warning on refresh / tab close while there are unsaved changes. */
export function useWarnOnLeave(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
}
