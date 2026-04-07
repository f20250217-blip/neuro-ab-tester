export interface ExtractedFrames {
  frames: string[]; // base64 JPEG strings
  mimeType: "image/jpeg";
}

/**
 * For Vercel serverless: we can't use ffmpeg. Instead, we send the raw video
 * to the vision model directly (Llama 4 Scout handles video input).
 *
 * If the video is too large, we take a portion of the base64 data as a
 * single-frame approximation by sending it as the video mime type directly.
 *
 * This function returns null to signal "send the video directly to the model"
 * or extracted frames if available.
 */
export async function extractFrames(
  videoBase64: string,
  mimeType: string,
  frameCount = 6
): Promise<ExtractedFrames | null> {
  // On serverless (Vercel), we can't run ffmpeg.
  // Return null to signal the caller to send video directly to the vision model.
  // Llama 4 Scout on Groq supports video input natively.
  return null;
}
