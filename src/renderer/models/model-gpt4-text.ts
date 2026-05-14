async function GPTText(
  text: string,
  prompt: string,
  apiKey: string,
  baseURL = "https://api.openai.com/v1/chat/completions"
): Promise<string> {
  const response = await fetch(baseURL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`GPT text request failed: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? "";
}

export default GPTText;
