import AzureOpenAI from "openai";
import { checkResponseStatus } from "./utils";

async function GPT(
    image: string,
    prompt: string,
    APIKey: string,
    baseURL: string
): Promise<string> {
    try {
        const openai = new AzureOpenAI({ apiKey: APIKey, baseURL: baseURL });

        const response = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: image,
                            },
                        },
                    ],
                },
            ],
        });

        const content = response.choices[0]?.message?.content;
        if (typeof content !== "string") {
            throw new Error("Azure OpenAI response did not include text content");
        }
        return content;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to process Azure OpenAI response");
    }
}

export default GPT;