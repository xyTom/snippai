// Using fetch API directly instead of OpenAI SDK
const PORTKEY_API_KEY = 'oo6Aq6IAJGWxjmRo0eK9s6Y8TPpz';
const PORTKEY_GATEWAY_URL = 'https://api.portkey.ai/v1/chat/completions';

async function Auto(image: string, prompt: string): Promise<string> {
    try {
        const myHeaders = new Headers();
        myHeaders.append("authorization", `Bearer ${PORTKEY_API_KEY}`);
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
        
        const response = await fetch(PORTKEY_GATEWAY_URL, requestOptions);
        const result = await response.json();
        console.log(result);
        return result.choices[0].message.content;
    } catch (error) {
        console.error('Error in Auto model:', error);
        throw error;
    }
}

export default Auto;
