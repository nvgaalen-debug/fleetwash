// Wasroute Planner - AI-advies via de Claude API.
// De API-sleutel staat als omgevingsvariabele in Netlify en komt nooit in de browser.
//
// Omgevingsvariabelen (Netlify > Site configuration > Environment variables):
//   ANTHROPIC_API_KEY  verplicht: je Claude API-sleutel (API_KEY werkt ook)
//   AI_MODEL           optioneel: ander model, standaard claude-sonnet-5-5
//   APP_PASSWORD       optioneel: wachtwoord dat de app moet meesturen,
//                      zodat niet iedereen met de link je sleutel kan gebruiken

const MAX_PROMPT = 20000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Alleen POST is toegestaan." }, 405);

  const key = process.env.ANTHROPIC_API_KEY || process.env.API_KEY;
  if (!key) return json({ error: "Geen API-sleutel ingesteld. Voeg ANTHROPIC_API_KEY toe in Netlify en deploy opnieuw." }, 500);

  const password = process.env.APP_PASSWORD;
  if (password && req.headers.get("x-app-password") !== password) {
    return json({ error: "Wachtwoord vereist." }, 401);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ongeldig verzoek." }, 400);
  }
  const prompt = String(body?.prompt || "").slice(0, MAX_PROMPT);
  if (!prompt.trim()) return json({ error: "Lege vraag." }, 400);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-sonnet-5-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: data?.error?.message || `API-fout ${r.status}` }, 502);
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
    if (!text) return json({ error: "Leeg antwoord van de AI." }, 502);
    return json({ text, truncated: data.stop_reason === "max_tokens" });
  } catch (e) {
    return json({ error: "De AI-dienst is niet bereikbaar." }, 502);
  }
};

export const config = { path: "/api/ai-advies" };
