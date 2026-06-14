import { getVercelToken } from "@/lib/settings";

interface DeployResult {
  url: string;
  deployId: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40)
    .replace(/-+$/, "");
}

export async function deployToVercel(html: string, businessName: string): Promise<DeployResult | null> {
  const token = getVercelToken();
  if (!token) return null;

  const projectName = `neuron-${slugify(businessName) || "site"}`;

  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      files: [
        {
          file: "index.html",
          data: Buffer.from(html).toString("base64"),
          encoding: "base64",
        },
      ],
      projectSettings: {
        framework: null,
        outputDirectory: null,
        installCommand: null,
        buildCommand: null,
      },
      target: "production",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn("[vercel] deploy failed:", err);
    return null;
  }

  const data = await res.json() as { id: string; url: string };
  return {
    deployId: data.id,
    url: `https://${data.url}`,
  };
}
