// Using fetch API directly instead of OpenAI SDK.
const getPortkeyConfig = () => ({
    apiKey: import.meta.env.VITE_PORTKEY_API_KEY?.trim() ?? "",
    gatewayUrl: import.meta.env.VITE_PORTKEY_GATEWAY_URL?.trim() || "https://api.portkey.ai/v1/chat/completions",
});

async function Auto(image: string, prompt: string): Promise<string> {
    try {
        const { apiKey, gatewayUrl } = getPortkeyConfig();
        if (!apiKey) {
            throw new Error("Auto model is not configured. Set VITE_PORTKEY_API_KEY or use another model/provider.");
        }

        const myHeaders = new Headers();
        myHeaders.append("authorization", `Bearer ${apiKey}`);
        myHeaders.append("content-type", "application/json");
        
        const raw = JSON.stringify({
            "model": "snapbit/snippai-vlm-large",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": `data:image/jpeg;base64,${image}`,
                            }
                        }
                    ]
                }
            ]
        });
        
        const requestOptions: RequestInit = {
            method: "POST",
            headers: myHeaders,
            body: raw,
            redirect: "follow" as RequestRedirect
        };
        
        const response = await fetch(gatewayUrl, requestOptions);
        if (!response.ok) {
            throw new Error(`Auto model request failed: ${response.status}`);
        }
        const result = await response.json();
        const content = result?.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
            throw new Error("Auto model response did not include text content");
        }
        return content;
    } catch (error) {
        console.error('Error in Auto model:', error);
        throw error;
    }
}

export default Auto;
