import OpenAI from 'openai';
async function GPT(image:string, prompt:string, APIKey:string): Promise<string> {
    const openai = new OpenAI({ apiKey: APIKey, dangerouslyAllowBrowser: true});
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
                    "url": `data:image/jpeg;base64,${image}`,
                },
              },
            ],
          },
        ],
      });
      console.log(response.choices[0]);
      return response.choices[0].toString();
}
export default GPT;
