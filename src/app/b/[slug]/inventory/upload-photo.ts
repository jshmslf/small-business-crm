import { addItemImage, discardUpload, getUploadSignature } from "./[id]/photo-actions";
import { compressImage } from "@/src/lib/compress-image";

export const MAX_SIZE = 10 * 1024 * 1024;
export const MAX_PHOTOS = 10;

export function checkPhoto(file: File): string | null {
    if (!file.type.startsWith("image/")) return `${file.name} isn't an image.`;
    if (file.size > MAX_SIZE) return `${file.name} is larger than 10 MB.`;
    return null;
}

export async function uploadOne(slug: string, itemId: string, file: File) {
    const problem = checkPhoto(file);

    if (problem) throw new Error(problem);

    // Shrink big phone photos first so the upload is faster
    const upload = await compressImage(file);

    // 1. Ask your server for permission
    const sig = await getUploadSignature(slug, itemId);
    if (!sig.ok) throw new Error(sig.error);

    // 2. Upload straight to Cloudinary
    const body = new FormData();
    body.append("file", upload);
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
    let error: string | null;
    try {
        const saved = await addItemImage(slug, itemId, { publicId: data.public_id, url: data.secure_url });
        error = saved.ok ? null : saved.error;
    } catch {
        error = `Couldn't save ${file.name}.`;
    }

    // Saving failed, so don't leave the file sitting in Cloudinary (best effort)
    if (error) {
        await discardUpload(slug, itemId, data.public_id).catch(() => {});
        throw new Error(error);
    }
}