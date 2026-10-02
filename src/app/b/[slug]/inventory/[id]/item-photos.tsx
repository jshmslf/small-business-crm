"use client";

import { useState } from "react";
import { ImageIcon, Star, Trash2 } from "lucide-react";
import { imageVariant } from "@/src/lib/image-url";
import { cn } from "@/src/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/status-badge";
import { EmptyState } from "@/src/components/empty-state";
import { Notice } from "@/src/components/form-field";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { IconButton } from "@/src/components/icon-button";
import { deleteItemImage, makeCoverImage } from "./photo-actions";

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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

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
      </CardHeader>

      <CardContent className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}

        {photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-25">
            <EmptyState
              icon={ImageIcon}
              title="No photos yet"
              description={canEdit ? "Add photos in the form below." : undefined}
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
