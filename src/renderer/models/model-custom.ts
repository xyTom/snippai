import { extractChatCompletionContent, checkResponseStatus } from "./utils";

const toChatCompletionsURL = (baseURL: string): string => {
    const normalized = baseURL.replace(/\/$/, "");
    return normalized.endsWith("/chat/completions")
        ? normalized
        : `${normalized}/v1/chat/completions`;
};

const isMiniMaxURL = (baseURL: string): boolean => {
    const url = baseURL.toLowerCase();
    return url.includes("minimaxi") || url.includes("minimax.io");
};

const toMiniMaxVLMURL = (baseURL: string): string => {
    const normalized = baseURL.replace(/\/$/, "");
    return normalized.replace(/\/v1\/chat\/completions$/, "") + "/v1/coding_plan/vlm";
};

export default async function customModel(
    image: string,
    prompt: string,
    apiKey = "",
    baseURL = "",
    modelName = "gpt-4o",
    orgId?: string
): Promise<string> {
    const headers: Record<string, string> = {
        "content-type": "application/json",
    };
    if (apiKey) {
        headers.authorization = `Bearer ${apiKey}`;
    }
    if (orgId) {
        headers["OpenAI-Organization"] = orgId;
    }

    try {
        // MiniMax requires using a dedicated VLM endpoint with different request format
        if (isMiniMaxURL(baseURL)) {
            const vlmURL = toMiniMaxVLMURL(baseURL);
            const vlmResponse = await fetch(vlmURL, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    prompt: prompt,
                    image_url: `data:image/jpeg;base64,${image}`,
                }),
            });
            checkResponseStatus(vlmResponse, "MiniMax VLM request");
            const vlmResult = await vlmResponse.json();

            const content = vlmResult?.content;
            if (typeof content !== "string" || !content) {
                const errorMsg = vlmResult?.base_resp?.status_msg;
                if (errorMsg && errorMsg !== "success") {
                    throw new Error(`MiniMax error: ${errorMsg}`);
                }
                throw new Error("MiniMax VLM response did not include content");
            }
            return content;
        }

        // Standard OpenAI-compatible API
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

        checkResponseStatus(response, "Custom model request");
        const result = await response.json();
        return extractChatCompletionContent(result);
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to process custom model response");
    }
}