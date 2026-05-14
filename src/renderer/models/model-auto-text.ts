const PORTKEY_API_KEY = "oo6Aq6IAJGWxjmRo0eK9s6Y8TPpz";
const PORTKEY_GATEWAY_URL = "https://api.portkey.ai/v1/chat/completions";

async function AutoText(text: string, prompt: string): Promise<string> {
  const response = await fetch(PORTKEY_GATEWAY_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${PORTKEY_API_KEY}`,
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
