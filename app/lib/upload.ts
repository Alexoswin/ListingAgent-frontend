/**
 * Presigns and uploads each file to S3, returning the stored URLs in order.
 * Shared by both selling flows — the manual wizard and the agent-generated one
 * hand the backend the same list of image URLs.
 */
export async function uploadImages(
  apiUrl: string,
  files: File[],
  onProgress: (message: string) => void,
): Promise<string[]> {
  const urls: string[] = [];

  for (const [index, file] of files.entries()) {
    onProgress(`Uploading image ${index + 1} of ${files.length}...`);

    const presign = await fetch(`${apiUrl}/uploads/s3-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileName: file.name, contentType: file.type }),
    });
    const presigned = await presign.json();
    if (!presign.ok) throw new Error(presigned.message ?? "Unable to prepare image upload");

    const upload = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!upload.ok) throw new Error("Image upload to S3 failed");

    urls.push(presigned.s3Url);
  }

  return urls;
}
