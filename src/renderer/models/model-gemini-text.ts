async function geminiText(text: string, prompt: string): Promise<string> {
  const response = await fetch(
    "https://s.global.ssl.fastly.net/v1beta/models/gemini-2.0-flash-lite:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }, { text }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
          stopSequences: [],
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH",
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini text request failed: ${response.status}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export default geminiText;
