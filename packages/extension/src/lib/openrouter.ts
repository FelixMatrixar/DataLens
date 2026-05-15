interface OpenRouterRequest {
  apiKey: string;
  model: string;
  fallbackModels?: string[];
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  temperature?: number;
  jsonMode?: boolean;
}

export async function callOpenRouter(req: OpenRouterRequest): Promise<string | null> {
  const models = [req.model, ...(req.fallbackModels ?? [])];

  const body: Record<string, any> = {
    models,
    max_tokens: req.maxTokens,
    temperature: req.temperature ?? 0,
    messages: [
      { role: "system", content: req.systemPrompt },
      { role: "user",   content: req.userMessage  },
    ],
  };

  if (req.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${req.apiKey}`,
        "HTTP-Referer":  "https://datalens.app",
        "X-Title":       "DataLens",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn(`[OpenRouter] ${res.status}`, await res.text());
      return null;
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() ?? null;

  } catch (err) {
    console.warn("[OpenRouter] fetch error:", err);
    return null;
  }
}
