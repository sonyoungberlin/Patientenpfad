const CHECKPOINT_LIBRARY_PATH = "/admin/practice-processes/checkpoints";

export function sanitizeCheckpointLibraryReturnTo(value?: string): string {
  if (!value?.startsWith(CHECKPOINT_LIBRARY_PATH)) return CHECKPOINT_LIBRARY_PATH;
  const nextCharacter = value.slice(CHECKPOINT_LIBRARY_PATH.length, CHECKPOINT_LIBRARY_PATH.length + 1);
  if (nextCharacter && nextCharacter !== "?" && nextCharacter !== "/") return CHECKPOINT_LIBRARY_PATH;

  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost" || !url.pathname.startsWith(CHECKPOINT_LIBRARY_PATH)) {
      return CHECKPOINT_LIBRARY_PATH;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return CHECKPOINT_LIBRARY_PATH;
  }
}