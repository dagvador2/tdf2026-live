-- DropIndex
DROP INDEX IF EXISTS "riders_token_key";

-- AlterTable: supprimer la colonne token (remplacée par Auth.js)
ALTER TABLE "riders" DROP COLUMN IF EXISTS "token";
