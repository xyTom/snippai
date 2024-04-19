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
        prompt: "\nThis is an image uploaded by a user, I need your help to analyze the content in the image, if the main content in the image is text, please return the result of OCR text recognition (only return the recognized text, don't add other descriptions), if the main content in the image is a mathematical formula, please return the Latex code of the mathematical formula (only return the Latex code corresponding to the formula, don't add extra If the main content of the image is a math formula, please return the Latex code of the math formula (only return the Latex code of the formula, don't add additional description), if the image contains neither text nor math formula, please return the detailed description of the image (please describe the content of the image in detail).\n",
    },
    {
        value: "Formula",
        label: "Formula",
        prompt: "Please return the Latex code for this math formula (return only the Latex code corresponding to the formula, do not add additional descriptions)",

    },
    {
        value: "Text",
        label: "Text",
        prompt: "Please return the result of OCR text recognition (only return the recognized text, do not add other descriptions)",
    },
    {
        value: "Code",
        label: "Code",
        prompt: "Please return the content of the code in the picture (please describe in detail what the code in the picture does)",
    },
    {
        value: "Table",
        label: "Table",
        prompt: "Please return the contents of the table in the image, using the MarkDown format.",
    },
    {
        value: "Solve",
        label: "Solve",
        prompt: "Please return to the answer to the question in the picture",
    },
    {
        value: "Image",
        label: "Image",
        prompt: "Please return a detailed description of the image (please describe in detail what is in the image)",
    },
    {
        value:"Color",
        label:"Color",
        prompt:"Please return the color information in the image, use #RRGGBB format to describe the color.",
    }
    ]