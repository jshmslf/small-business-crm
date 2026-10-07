"use client";

import { Button } from "@/src/components/ui/button";
import { ConfirmDialog } from "@/src/components/confirm-dialog";

/** Cancel that asks "Discard changes?" first when the form has unsaved changes. */
export function CancelButton({
  dirty,
  onCancel,
  children = "Cancel",
}: {
  dirty: boolean;
  onCancel: () => unknown;
  children?: React.ReactNode;
}) {
  if (!dirty) {
    return <Button variant="secondary" onClick={onCancel}>{children}</Button>;
  }

  return (
    <ConfirmDialog
      trigger={<Button variant="secondary">{children}</Button>}
      title="Discard changes?"
      description="You have unsaved changes. If you leave now, they'll be lost."
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      destructive
      onConfirm={onCancel}
    />
  );
}
