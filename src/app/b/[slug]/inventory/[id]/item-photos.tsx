"use client";

import { useRef, useState } from "react";
import { imageVariant } from "@/src/lib/image-url";
import { getUploadSignature, addItemImage, deleteItemImage, makeCoverImage } from "./photo-actions";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

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

  async function uploadOne(file: File) {
    if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image.`);
    if (file.size > MAX_SIZE) throw new Error(`${file.name} is larger than 10 MB.`);

    // 1. Ask your server for permission
    const sig = await getUploadSignature(slug, itemId);
    if (!sig.ok) throw new Error(sig.error);

    // 2. Upload straight to Cloudinary
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", sig.apiKey);
    body.append("timestamp", String(sig.timestamp));
    body.append("signature", sig.signature);
    body.append("folder", sig.folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: "POST",
      body,
    });
    if (!res.ok) throw new Error(`Upload failed for ${file.name}.`);
    const data = await res.json();

    // 3. Tell your server to save it
    const saved = await addItemImage(slug, itemId, { publicId: data.public_id, url: data.secure_url });
    if (!saved.ok) throw new Error(saved.error);
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const list = Array.from(files);
    setRemaining(list.length);

    // One at a time, so photos keep the order you selected them in
    for (const file of list) {
      try {
        await uploadOne(file);
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
    if (!confirm("Delete this photo?")) return;
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
    <section className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Photos ({photos.length}/10)</h2>
        {canEdit && (
          <label className={`cursor-pointer rounded border px-3 py-1 text-sm ${remaining ? "opacity-50" : "hover:bg-gray-50"}`}>
            {remaining ? `Uploading ${remaining}...` : "+ Add photos"}
            <input ref={inputRef} type="file" accept="image/*" multiple hidden
              disabled={remaining > 0} onChange={(e) => handleFiles(e.target.files)} />
          </label>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {photos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
          No photos yet{canEdit && ". The first photo you add becomes the cover"}.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <div key={photo.id} className={`group relative overflow-hidden rounded-lg border ${busyId === photo.id ? "opacity-50" : ""}`}>
              <img src={imageVariant(photo.url, 300)} alt="" className="aspect-square w-full object-cover" />
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">Cover</span>
              )}
              {canEdit && (
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                  {index !== 0 ? (
                    <button onClick={() => handleMakeCover(photo.id)} disabled={!!busyId}>Make cover</button>
                  ) : <span />}
                  <button onClick={() => handleDelete(photo.id)} disabled={!!busyId}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}