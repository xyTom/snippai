import OpenAI from 'openai';
async function GPT(image:string,APIKey:string): Promise<string> {
    const openai = new OpenAI({ apiKey: APIKey });
    const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "\n这是一张用户上传的图片，我需要你帮忙分析图片中的内容，如果图片中的主要内容是文字，请返回OCR文字识别的结果（只返回识别到的文字，不要添加其他描述），如果图片中的主要内容是数学公式，请返回该数学公式的Latex代码（只返回公式对应的Latex代码，不要添加额外的描述），如果图片中既不包括文字，也不包含数学公式，请返回图片的详细描述（请详细描述图片中的内容）\n" },
              {
                type: "image_url",
                image_url: {
                    "url": image,
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
