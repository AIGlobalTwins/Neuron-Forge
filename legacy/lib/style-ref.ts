import Anthropic from "@anthropic-ai/sdk";

// Turn a user-supplied reference design (a Dribbble shot, a screenshot of a site
// they like) into a concise DESIGN DIRECTION brief that the website generators
// append to their prompt — so the output matches the aesthetic without copying.
// Cheap Haiku vision call; returns "" when there is no image or it fails.
export async function styleBriefFromImage(anthropicKey: string, imageInput: string): Promise<string> {
  if (!anthropicKey || !imageInput) return "";
  const m = imageInput.match(/^data:(image\/[\w.+-]+);base64,(.*)$/);
  const mediaTypeRaw = m?.[1] || "image/jpeg";
  const mediaType = (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mediaTypeRaw) ? mediaTypeRaw : "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  const data = m?.[2] || imageInput.replace(/^data:image\/[\w.+-]+;base64,/, "");
  if (!data || data.length < 50) return "";

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            {
              type: "text",
              text: "You are a design director. From this design/website reference, write a concise, actionable brief to recreate its AESTHETIC only (not its content). Cover: colour palette (hex if visible), typography (style/weight/scale), spacing & density, layout patterns, hero treatment, button/card style, imagery style, and overall mood. 8-14 short bullet lines. No preamble. Never copy any text or brand from the image.",
            },
          ],
        },
      ],
    });
    const block = res.content.find((b: Anthropic.ContentBlock) => b.type === "text");
    const brief = block && block.type === "text" ? block.text.trim() : "";
    if (!brief) return "";
    return `\n\n=== DESIGN DIRECTION (the user supplied a reference design — MATCH this aesthetic: palette, typography, spacing, layout, mood. Generate ORIGINAL content for THIS business; never copy text or logos from the reference) ===\n${brief}\n=== END DESIGN DIRECTION ===\n`;
  } catch {
    return "";
  }
}
