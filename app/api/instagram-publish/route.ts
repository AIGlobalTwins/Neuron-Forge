import { NextRequest, NextResponse } from "next/server";
import { getInstagramToken, getInstagramAccountId } from "@/lib/settings";

const GRAPH = "https://graph.facebook.com/v19.0";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { caption, imageUrl } = body;

  if (!caption) {
    return NextResponse.json({ error: "caption é obrigatório" }, { status: 400 });
  }
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl é obrigatório para publicar no Instagram" }, { status: 400 });
  }

  const token = getInstagramToken();
  const accountId = getInstagramAccountId();

  if (!token || !accountId) {
    return NextResponse.json({ error: "Instagram não configurado. Adiciona o Access Token e Account ID nas Configurações." }, { status: 400 });
  }

  // Step 1: Create media container
  const createRes = await fetch(`${GRAPH}/${accountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: `${caption}`,
      access_token: token,
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.id) {
    return NextResponse.json(
      { error: createData.error?.message || "Erro ao criar container de media" },
      { status: 500 }
    );
  }

  // Step 2: Publish
  const publishRes = await fetch(`${GRAPH}/${accountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: createData.id,
      access_token: token,
    }),
  });

  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    return NextResponse.json(
      { error: publishData.error?.message || "Erro ao publicar no Instagram" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, postId: publishData.id });
}
