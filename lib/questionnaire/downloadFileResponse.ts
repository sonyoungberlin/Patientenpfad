export function filenameFromContentDisposition(value: string | null, fallback: string): string {
  return value?.match(/filename="([^"]+)"/i)?.[1] ?? fallback;
}

export async function downloadFileResponse(response: Response, fallbackFilename: string): Promise<void> {
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filenameFromContentDisposition(
    response.headers.get("content-disposition"),
    fallbackFilename,
  );
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}