-- CreateTable
CREATE TABLE "LibraryCheckpoint" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orientation_hint" TEXT,
    "anchors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryCheckpoint_pkey" PRIMARY KEY ("id")
);
