import OpenAI from 'openai';
async function GPT(image:string, prompt:string, APIKey:string): Promise<string> {
    const myHeaders = new Headers();
    myHeaders.append("authorization", `Bearer ${APIKey}`);
    myHeaders.append("content-type", "application/json");
    const raw = JSON.stringify({
      "model": "gpt-4-vision-preview",
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
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", requestOptions);
    const result = await response.json();
    return result["choices"][0]["message"]["content"];
  
    
    
    // const openai = new OpenAI({ apiKey: APIKey, dangerouslyAllowBrowser: true});
    // const response = await openai.chat.completions.create({
    //     model: "gpt-4-vision-preview",
    //     messages: [
    //       {
    //         role: "user",
    //         content: [
    //           { type: "text", text: prompt },
    //           {
    //             type: "image_url",
    //             image_url: {
    //                 "url": `data:image/jpeg;base64,${image}`,
    //             },
    //           },
    //         ],
    //       },
    //     ],
    //   });
    //   console.log(response.choices[0]);
    //   return response.choices[0].toString();
}
export default GPT;
