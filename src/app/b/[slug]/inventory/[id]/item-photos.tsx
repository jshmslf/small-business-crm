"use client";

import { useRef, useState } from "react";
import { ImageIcon, ImagePlus, Star, Trash2 } from "lucide-react";
import { imageVariant } from "@/src/lib/image-url";
import { cn } from "@/src/lib/utils";
import { buttonVariants } from "@/src/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/status-badge";
import { EmptyState } from "@/src/components/empty-state";
import { Notice } from "@/src/components/form-field";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { IconButton } from "@/src/components/icon-button";
import { deleteItemImage, makeCoverImage } from "./photo-actions";
import { uploadOne } from "../upload-photo";

export function ItemPhotos({
  slug,
  itemId,
  photos,
  canEdit,
}: {
  slug: string;
  itemId: string;
  photos: { id: string; url: string }[];
  canEdit: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [remaining, setRemaining] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");


  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const list = Array.from(files);
    setRemaining(list.length);

    // One at a time, so photos keep the order you selected them in
    for (const file of list) {
      try {
        await uploadOne(slug, itemId, file);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
        break;
      } finally {
        setRemaining((n) => n - 1);
      }
    }

    setRemaining(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const result = await deleteItemImage(slug, itemId, id);
    setBusyId(null);
    if (!result.ok) setError(result.error);
  }

  async function handleMakeCover(id: string) {
    setBusyId(id);
    const result = await makeCoverImage(slug, itemId, id);
    setBusyId(null);
    if (!result.ok) setError(result.error);
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Photos ({photos.length}/10)</CardTitle>
        {canEdit && (
          <CardAction>
            <label
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "cursor-pointer has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100",
                remaining > 0 && "pointer-events-none opacity-50"
              )}
            >
              <ImagePlus aria-hidden />
              {remaining ? `Uploading ${remaining}...` : "Add photos"}
              <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only"
                disabled={remaining > 0} onChange={(e) => handleFiles(e.target.files)} />
            </label>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}

        {photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-25">
            <EmptyState
              icon={ImageIcon}
              title="No photos yet"
              description={canEdit ? "The first photo you add becomes the cover." : undefined}
              className="py-8"
            />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((photo, index) => (
              <div key={photo.id}
                className={cn(
                  "group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50",
                  busyId === photo.id && "opacity-50"
                )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageVariant(photo.url, 300)} alt="" className="aspect-square w-full object-cover" />
                {index === 0 && (
                  <Badge tone="brand" className="absolute top-2 left-2 shadow-xs">Cover</Badge>
                )}
                {canEdit && (
                  <div className="absolute right-1.5 bottom-1.5 flex gap-1 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    {index !== 0 && (
                      <IconButton label="Make cover" size="icon-xs" variant="secondary"
                        onClick={() => handleMakeCover(photo.id)} disabled={!!busyId}>
                        <Star />
                      </IconButton>
                    )}
                    <ConfirmDialog
                      trigger={
                        <IconButton label="Delete" size="icon-xs" variant="secondary"
                          className="text-error-700 hover:text-error-700" disabled={!!busyId}>
                          <Trash2 />
                        </IconButton>
                      }
                      title="Delete this photo?"
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => handleDelete(photo.id)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
