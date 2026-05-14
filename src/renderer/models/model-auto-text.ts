const getPortkeyConfig = () => ({
  apiKey: import.meta.env.VITE_PORTKEY_API_KEY?.trim() ?? "",
  gatewayUrl: import.meta.env.VITE_PORTKEY_GATEWAY_URL?.trim() || "https://api.portkey.ai/v1/chat/completions",
});

async function AutoText(text: string, prompt: string): Promise<string> {
  const { apiKey, gatewayUrl } = getPortkeyConfig();
  if (!apiKey) {
    throw new Error("Auto model is not configured. Set VITE_PORTKEY_API_KEY or use another model/provider.");
  }

  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "snapbit/snippai-vlm-large",
      messages: [
        {
          role: "user",
          content: `${prompt}\n\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Auto text request failed: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? "";
}

export default AutoText;
