// node --version # Should be >= 18
// npm install @google/generative-ai

const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");

  
  const MODEL_NAME = "gemini-pro-vision";
  const API_KEY = "AIzaSyDziYzKWXroiGqojgtbmBgj0iMwHH0EzoY";

  async function run(image) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
    const generationConfig = {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
    };
  
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
  
  
    const parts = [
      {
        inlineData: {
          mimeType: "image/png",
          data: image,
        }
      },
      {text: "\n这是一张用户上传的图片，我需要你帮忙分析图片中的内容，如果图片中的主要内容是文字，请返回OCR文字识别的结果（只返回识别到的文字，不要添加其他描述），如果图片中的主要内容是数学公式，请返回该数学公式的Latex代码（只返回公式对应的Latex代码，不要添加额外的描述），如果图片中既不包括文字，也不包含数学公式，请返回图片的详细描述（请详细描述图片中的内容）"},
    ];
  
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
      safetySettings,
    });
  
    const response = result.response;
    console.log(response.text());
    return response.text();
  }
  
  module.exports = { run };