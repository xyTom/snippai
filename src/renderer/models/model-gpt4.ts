import { extractChatCompletionContent, checkResponseStatus } from "./utils";

async function GPT(image: string, prompt: string, APIKey: string): Promise<string> {
    const myHeaders = new Headers();
    myHeaders.append("authorization", `Bearer ${APIKey}`);
    myHeaders.append("content-type", "application/json");

    const raw = JSON.stringify({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: prompt,
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${image}`,
                        },
                    },
                ],
            },
        ],
    });

    const requestOptions: RequestInit = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow" as RequestRedirect,
    };

    try {
        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            requestOptions
        );
        checkResponseStatus(response, "OpenAI API request");

        const result = await response.json();
        return extractChatCompletionContent(result);
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to process GPT response");
    }
}

export default GPT;