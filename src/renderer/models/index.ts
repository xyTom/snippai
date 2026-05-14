import { models } from "../lib/models";

type ModelRunner = (
    input: string,
    prompt: string,
    apiKey?: string,
    baseURL?: string
) => Promise<string>;

export default class aiModel {
    model: ModelRunner;
    importPath: string;

    private constructor(importPath: string, model: ModelRunner) {
        this.importPath = importPath;
        this.model = model;
    }

    static async create(model: string) {
        const configuredModel = models.find((m) => m.value === model);
        const importPath = configuredModel?.modelScript || "gemini";
        const module = await import(`./model-${importPath}.ts`) as { default: ModelRunner };
        return new aiModel(importPath, module.default);
    }

    async run(image: string, prompt: string, apiKey?:string, baseURL?:string) {
        if (apiKey) {
            if (baseURL) {
                return this.model(image, prompt, apiKey, baseURL);
            }
            return this.model(image, prompt, apiKey);
        }
        return this.model(image, prompt);
    }

    async runText(text: string, prompt: string, apiKey?: string, baseURL?: string) {
        const module = await import(`./model-${this.importPath}-text.ts`) as { default: ModelRunner };
        const model = module.default;
        if (apiKey) {
            if (baseURL) {
                return model(text, prompt, apiKey, baseURL);
            }
            return model(text, prompt, apiKey);
        }
        return model(text, prompt);
    }
}
