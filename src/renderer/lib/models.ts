export interface ModelConfig {
  value: string;
  label: string;
  requireApiKey: boolean;
  requireBaseURL: boolean;
  modelScript: string;
}

export interface PromptOption {
  value: string;
  labelKey: string;
  prompt: string;
}

const imageAnalysisPrompt =
  "This is an image uploaded by a user. Analyze its content. If the main content is text, return only the OCR text. If the main content is a mathematical formula, return only the corresponding LaTeX. If the image contains neither text nor a math formula, describe the image in detail.";

const promptSet: PromptOption[] = [
  {
    value: "Auto",
    labelKey: "auto",
    prompt: imageAnalysisPrompt,
  },
  {
    value: "Formula",
    labelKey: "formula",
    prompt:
      "Return only the LaTeX code for the math formula in the image. Do not add explanations.",
  },
  {
    value: "Text",
    labelKey: "text",
    prompt:
      "Return only the original text recognized in the image. Do not add descriptions or explanations.",
  },
  {
    value: "Code",
    labelKey: "code",
    prompt: "Describe what the code in the image does and include the code content.",
  },
  {
    value: "Table",
    labelKey: "table",
    prompt: "Return the table contents in Markdown table format.",
  },
  {
    value: "Solve",
    labelKey: "solve",
    prompt: "Return the answer to the question shown in the image.",
  },
  {
    value: "Image",
    labelKey: "image",
    prompt: "Describe the image content in detail.",
  },
  {
    value: "Color",
    labelKey: "color",
    prompt: "Return color information from the image using #RRGGBB format.",
  },
  {
    value: "Translate",
    labelKey: "translate",
    prompt:
      "Translate the text in the image to the target language. Only return the translated text.",
  },
  {
    value: "Calendar",
    labelKey: "calendar_prompt",
    prompt:
      "Identify schedule or event information in the image and return a valid iCalendar (.ics) VCALENDAR document. Only return the ICS data.",
  },
];

export const models: ModelConfig[] = [
  {
    value: "auto",
    label: "Auto",
    requireApiKey: false,
    requireBaseURL: false,
    modelScript: "auto",
  },
  {
    value: "gemini",
    label: "Google Gemini",
    requireApiKey: false,
    requireBaseURL: false,
    modelScript: "gemini",
  },
  {
    value: "gpt4",
    label: "OpenAI GPT-4",
    requireApiKey: true,
    requireBaseURL: false,
    modelScript: "gpt4",
  },
];

export const promptOptions: Record<string, PromptOption[]> = {
  auto: promptSet,
  gemini: promptSet,
  gpt4: promptSet,
  custom: promptSet,
};

export const getPromptModelKey = (model: string): string => {
  if (model.startsWith("provider:")) {
    return "custom";
  }

  return promptOptions[model] ? model : "auto";
};

export const getPromptOptions = (model: string): PromptOption[] =>
  promptOptions[getPromptModelKey(model)] ?? promptSet;

export const getBaseModel = (model: string): ModelConfig | undefined =>
  models.find((item) => item.value === model);
