import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const repositoryRoot = resolve(new URL("..", import.meta.url).pathname);
const outputPath = process.argv[2] ?? "docs/admin-library-preflight-before.json";

function canonicalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function digest(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

async function sourceFingerprint(relativePath) {
  const content = await readFile(resolve(repositoryRoot, relativePath), "utf8");
  return {
    path: relativePath,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

async function collect() {
  const [checkpoints, profiles] = await Promise.all([
    prisma.libraryCheckpoint.findMany({ orderBy: { id: "asc" } }),
    prisma.libraryCaseProfile.findMany({ orderBy: { id: "asc" } }),
  ]);

  const adminCheckpoints = checkpoints.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    orientation_hint: row.orientation_hint,
    anchors: row.anchors,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const adminProfiles = profiles.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    checkpoint_refs: row.checkpoint_refs,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  const sources = await Promise.all([
    sourceFingerprint("lib/practiceProcesses/checkpointCatalog.ts"),
    sourceFingerprint("lib/practiceProcesses/caseProfileLibrary.ts"),
  ]);

  const inventory = {
    generatedAt: new Date().toISOString(),
    protectionScope: [
      "LibraryCheckpoint",
      "LibraryCaseProfile",
      "static checkpoint catalog",
      "static case-profile catalog",
    ],
    libraryCheckpoint: {
      count: adminCheckpoints.length,
      ids: adminCheckpoints.map((row) => row.id),
      anchorIds: adminCheckpoints.flatMap((row) =>
        Array.isArray(row.anchors)
          ? row.anchors.flatMap((anchor) =>
              anchor && typeof anchor === "object" && typeof anchor.id === "string"
                ? [anchor.id]
                : [],
            )
          : [],
      ).sort(),
      rows: adminCheckpoints,
    },
    libraryCaseProfile: {
      count: adminProfiles.length,
      ids: adminProfiles.map((row) => row.id),
      checkpointRefs: adminProfiles.map((row) => ({ id: row.id, checkpoint_refs: row.checkpoint_refs })),
      rows: adminProfiles,
    },
    staticCatalogSources: sources,
  };

  return {
    ...inventory,
    canonicalSha256: digest(inventory),
  };
}

try {
  const report = await collect();
  const destination = resolve(repositoryRoot, outputPath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    ok: true,
    output: destination,
    libraryCheckpointCount: report.libraryCheckpoint.count,
    libraryCaseProfileCount: report.libraryCaseProfile.count,
    canonicalSha256: report.canonicalSha256,
  }, null, 2));
} finally {
  await prisma.$disconnect();
}