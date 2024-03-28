async function gemini(image:string): Promise<string> {
const myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

const raw = JSON.stringify({
  "contents": [
    {
      "parts": [
        {
          "inlineData": {
            "mimeType": "image/jpeg",
            "data": image
          }
        },
        {
          "text": "\n这是一张用户上传的图片，我需要你帮忙分析图片中的内容，如果图片中的主要内容是文字，请返回OCR文字识别的结果（只返回识别到的文字，不要添加其他描述），如果图片中的主要内容是数学公式，请返回该数学公式的Latex代码（只返回公式对应的Latex代码，不要添加额外的描述），如果图片中既不包括文字，也不包含数学公式，请返回图片的详细描述（请详细描述图片中的内容）\n"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.4,
    "topK": 32,
    "topP": 1,
    "maxOutputTokens": 4096,
    "stopSequences": []
  },
  "safetySettings": [
    {
      "category": "HARM_CATEGORY_HARASSMENT",
      "threshold": "BLOCK_ONLY_HIGH"
    },
    {
      "category": "HARM_CATEGORY_HATE_SPEECH",
      "threshold": "BLOCK_ONLY_HIGH"
    },
    {
      "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      "threshold": "BLOCK_ONLY_HIGH"
    },
    {
      "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
      "threshold": "BLOCK_ONLY_HIGH"
    }
  ]
});

const requestOptions: RequestInit = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow" as RequestRedirect // Fix the type mismatch error by explicitly casting the value to RequestRedirect type
};

const response = await fetch("https://s.global.ssl.fastly.net/v1/models/gemini-1.0-pro-vision-latest:generateContent", requestOptions);
const result = await response.json();
return result["candidates"][0]["content"]["parts"][0]["text"];
}

export default gemini;