// 共享的工具函数，用于统一处理模型 API 响应

/**
 * 从 chat completions 格式的响应中提取文本内容
 */
export function extractChatCompletionContent(result: any): string {
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
        const errorMsg = result?.error?.message || result?.error?.type;
        if (errorMsg) {
            throw new Error(`API Error: ${errorMsg}`);
        }
        throw new Error("Response did not include text content");
    }
    return content;
}

/**
 * 从 Gemini 格式的响应中提取文本内容
 */
export function extractGeminiContent(result: any): string {
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text === "string") {
        return text;
    }

    const apiError = result?.error?.message;
    if (apiError) {
        throw new Error(`Gemini API Error: ${apiError}`);
    }

    const blockReason = result?.promptFeedback?.blockReason;
    if (blockReason) {
        const reasonMessages: Record<string, string> = {
            SAFETY: "Content blocked by safety filters",
            OTHER: "Content blocked for other reasons",
        };
        throw new Error(reasonMessages[blockReason] || `Content blocked: ${blockReason}`);
    }

    if (result?.candidates === null || result?.candidates === undefined) {
        throw new Error("No candidates in Gemini response");
    }

    throw new Error("Gemini response did not include text content");
}

/**
 * 检查 HTTP 响应状态
 */
export function checkResponseStatus(response: Response, context: string): void {
    if (!response.ok) {
        let errorMessage = `${context} failed: ${response.status}`;
        if (response.status === 401) {
            errorMessage = `${context} failed: Invalid API key`;
        } else if (response.status === 429) {
            errorMessage = `${context} failed: Rate limit exceeded`;
        } else if (response.status === 400) {
            errorMessage = `${context} failed: Bad request`;
        }
        throw new Error(errorMessage);
    }
}