/**
 * Finds Cloudinary photos that no ItemImage row points to (e.g. a tab closed mid-upload).
 *
 *   npm run photos:orphans               dry run: just lists them
 *   npm run photos:orphans -- --delete   deletes them
 *
 * Uses the DATABASE_URL and CLOUDINARY_* values from .env, so the database and the
 * Cloudinary folder must belong to the same environment.
 */
import "dotenv/config";
import { cloudinary } from "../src/lib/cloudinary";
import { prisma } from "../src/lib/prisma";

const MIN_AGE_MS = 60 * 60 * 1000; // skip anything newer than 1 hour, it may still be saving
const args = process.argv.slice(2);
const shouldDelete = args.includes("--delete");
const force = args.includes("--force");

type Resource = { public_id: string; bytes: number; created_at: string };

async function listCloudinaryPhotos(prefix: string) {
  const all: Resource[] = [];
  let cursor: string | undefined;
  do {
    const page = await cloudinary.api.resources({
      type: "upload",
      prefix,
      max_results: 500,
      next_cursor: cursor,
    });
    all.push(...(page.resources as Resource[]));
    cursor = page.next_cursor;
  } while (cursor);
  return all;
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

async function main() {
  const folder = process.env.CLOUDINARY_FOLDER ?? "buy-n-sell-dev";
  console.log(`Cloudinary folder: ${folder}/`);

  const [photos, rows] = await Promise.all([
    listCloudinaryPhotos(`${folder}/`),
    prisma.itemImage.findMany({ select: { publicId: true } }),
  ]);
  const known = new Set(rows.map((r) => r.publicId));

  const cutoff = Date.now() - MIN_AGE_MS;
  const orphans = photos.filter(
    (p) => !known.has(p.public_id) && new Date(p.created_at).getTime() < cutoff
  );

  console.log(`${photos.length} file(s) in Cloudinary, ${rows.length} photo row(s) in the database.`);
  if (orphans.length === 0) {
    console.log("No orphaned photos.");
    return;
  }

  for (const p of orphans) console.log(`  ${p.public_id}  (${formatSize(p.bytes)})`);
  const total = orphans.reduce((sum, p) => sum + p.bytes, 0);
  console.log(`${orphans.length} orphaned photo(s), ${formatSize(total)} in total.`);

  if (!shouldDelete) {
    console.log("Dry run. Re-run with --delete to remove them.");
    return;
  }

  // Every single file looking orphaned usually means the wrong database for this folder
  if (orphans.length === photos.length && !force) {
    console.log("Refusing to delete: EVERY file in the folder looks orphaned.");
    console.log("Check that DATABASE_URL and CLOUDINARY_FOLDER are the same environment, then add --force.");
    process.exitCode = 1;
    return;
  }

  for (let i = 0; i < orphans.length; i += 100) {
    const batch = orphans.slice(i, i + 100).map((p) => p.public_id);
    await cloudinary.api.delete_resources(batch);
    console.log(`Deleted ${Math.min(i + 100, orphans.length)}/${orphans.length}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
