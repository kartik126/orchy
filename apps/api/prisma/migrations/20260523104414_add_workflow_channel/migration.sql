-- AlterTable
ALTER TABLE "Agent" ALTER COLUMN "model" SET DEFAULT 'gemini-2.5-flash';

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "channel" TEXT;
