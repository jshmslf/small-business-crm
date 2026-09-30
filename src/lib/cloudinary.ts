import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export { cloudinary };

export function itemFolder(businessId: string, itemId: string) {
    const root = process.env.CLOUDINARY_FOLDER ?? "buy-n-sell-dev";
    return `${root}/${businessId}/items/${itemId}`;
}