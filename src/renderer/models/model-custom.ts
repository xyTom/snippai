const toChatCompletionsURL = (baseURL: string): string => {
  const normalized = baseURL.replace(/\/$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/v1/chat/completions`;
};

export default async function customModel(
  image: string,
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
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${image}` },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Custom model request failed: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? "";
}
