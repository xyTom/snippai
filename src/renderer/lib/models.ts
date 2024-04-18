export const models = [
    {
      value: "gemini",
      label: "Google Gemini",
      requireApiKey: false,
      modelScript: "gemini",
    },
    {
      value: "gpt4",
      label: "OpenAI GPT-4",
      requireApiKey: true,
      modelScript: "gpt4",
    },
  ]

export const promptOptions = [
    {
        value: "Auto",
        label: "Auto",
        prompt: "\n这是一张用户上传的图片，我需要你帮忙分析图片中的内容，如果图片中的主要内容是文字，请返回OCR文字识别的结果（只返回识别到的文字，不要添加其他描述），如果图片中的主要内容是数学公式，请返回该数学公式的Latex代码（只返回公式对应的Latex代码，不要添加额外的描述），如果图片中既不包括文字，也不包含数学公式，请返回图片的详细描述（请详细描述图片中的内容）\n",
    },
    {
        value: "Formula",
        label: "Formula",
        prompt: "请返回该数学公式的Latex代码（只返回公式对应的Latex代码，不要添加额外的描述）",

    },
    {
        value: "Text",
        label: "Text",
        prompt: "请返回OCR文字识别的结果（只返回识别到的文字，不要添加其他描述）",
    },
    {
        value: "Code",
        label: "Code",
        prompt: "请返回图片中的代码内容（请详细描述图片中的代码内容）",
    },
    {
        value: "Table",
        label: "Table",
        prompt: "请返回图片中的表格内容,使用MarkDown格式",
    },
    {
        value: "Solve",
        label: "Solve",
        prompt: "请返回图片中的题目的解答",
    },
    {
        value: "Image",
        label: "Image",
        prompt: "请返回图片的详细描述（请详细描述图片中的内容）",
    }
    ]