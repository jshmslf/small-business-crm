/*
  Warnings:

  - You are about to drop the column `assginedAt` on the `MembershipRole` table. All the data in the column will be lost.
  - You are about to drop the column `platformRole` on the `user` table. All the data in the column will be lost.
  - Made the column `name` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MembershipRole" DROP COLUMN "assginedAt",
ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "platformRole",
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'user';

-- DropEnum
DROP TYPE "PlatformRole";
