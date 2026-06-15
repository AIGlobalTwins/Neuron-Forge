/**
 * Shared quality bar injected into the text agents' prompts (SEO, Ads, Email,
 * Consulting, Content Calendar). The domain prompts already enforce structure and
 * "be specific" — this adds the one thing that most makes AI output feel generic:
 * a concrete ban on AI clichés, plus voice + completeness + correct language.
 * Accepts either a code ("pt"/"en"/"es") or a label ("Português europeu", ...).
 */
function normalizeLang(input: string): "pt" | "en" | "es" {
  const s = (input || "").toLowerCase();
  if (s.startsWith("en") || s.includes("ngl")) return "en";
  if (s.startsWith("es") || s.includes("span") || s.includes("español") || s.includes("espanhol")) return "es";
  return "pt";
}

export function qualityBar(language: string): string {
  const l = normalizeLang(language);

  if (l === "en") {
    return `QUALITY BAR (MANDATORY):
- Write like a senior human expert in the sector, not like AI. Concrete and specific to THIS business — never interchangeable boilerplate.
- BANNED AI clichés (never use): "In today's world", "In an increasingly digital world", "Elevate your business", "Discover how", "It's not just X, it's Y", "Imagine a...", "Take your business to the next level", "Welcome to the future", "tailored solutions", "trusted partner", "unlock", "seamless", "game-changer", "in the ever-evolving landscape", "look no further".
- No filler. Every sentence must carry real information or a real benefit.
- Use concrete data (numbers, %, timeframes, prices) wherever possible; avoid empty intensifiers ("very", "high-quality", "a range of") with no substance.
- Active voice, direct claims. Correct, natural English.
- COMPLETE, ready-to-use output — no placeholders like "[insert here]".`;
  }

  if (l === "es") {
    return `NIVEL DE CALIDAD (OBLIGATORIO):
- Escribe como un experto humano sénior del sector, no como IA. Concreto y específico para ESTE negocio.
- PROHIBIDOS los clichés de IA: "En el mundo actual", "En un mundo cada vez más digital", "Eleva tu negocio", "Descubre cómo", "No es solo X, es Y", "Imagina un...", "Lleva tu negocio al siguiente nivel", "Bienvenido al futuro", "soluciones a medida", "socio de confianza", "en el panorama actual".
- Sin relleno. Cada frase aporta información o un beneficio real.
- Usa datos concretos (números, %, plazos, precios) siempre que sea posible; evita intensificadores vacíos ("muy", "de calidad", "varios") sin sustancia.
- Voz activa, afirmaciones directas. Español correcto y natural.
- Resultado COMPLETO y listo para usar — sin marcadores tipo "[insertar aquí]".`;
  }

  return `NÍVEL DE QUALIDADE (OBRIGATÓRIO):
- Escreve como um especialista humano sénior do sector, não como IA. Concreto e específico a ESTE negócio — nunca texto intermutável.
- PROIBIDOS clichés de IA: "No mundo de hoje", "Num mundo cada vez mais digital", "Eleve o seu negócio", "Descubra como", "Não é apenas X, é Y", "Imagine um(a)...", "Leve o seu negócio para o próximo nível", "Bem-vindo ao futuro", "soluções à medida", "parceiro de confiança", "no panorama atual", "não procure mais".
- Sem enchimento. Cada frase carrega informação ou um benefício real.
- Usa dados concretos (números, %, prazos, preços) sempre que possível; evita intensificadores vazios ("muito", "de qualidade", "vários") sem substância.
- Voz ativa, afirmações diretas. Português de Portugal correto e natural (não brasileiro).
- Output COMPLETO e pronto a usar — sem placeholders tipo "[inserir aqui]".`;
}
