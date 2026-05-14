const toChatCompletionsURL = (baseURL: string): string => {
  const normalized = baseURL.replace(/\/$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/v1/chat/completions`;
};

export default async function customTextModel(
  text: string,
  prompt: string,
  apiKey: string,
  baseURL: string,
  modelName = "gpt-4o",
  orgId?: string
): Promise<string> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };
  if (orgId) {
    headers["OpenAI-Organization"] = orgId;
  }

  const response = await fetch(toChatCompletionsURL(baseURL), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Custom text model request failed: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? "";
}
