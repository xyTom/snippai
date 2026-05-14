import { models } from "../lib/models";

type ModelRunner = (
    input: string,
    prompt: string,
    apiKey?: string,
    baseURL?: string,
    modelName?: string,
    orgId?: string
) => Promise<string>;

export default class aiModel {
    model: ModelRunner;
    importPath: string;

    private constructor(importPath: string, model: ModelRunner) {
        this.importPath = importPath;
        this.model = model;
    }

    static async create(model: string): Promise<aiModel> {
        const configuredModel = models.find((m) => m.value === model);
        const importPath = model.startsWith("provider:")
            ? "custom"
            : configuredModel?.modelScript || "gemini";
        const module = await import(`./model-${importPath}.ts`) as { default: ModelRunner };
        return new aiModel(importPath, module.default);
    }

    async run(
        image: string,
        prompt: string,
        apiKey?: string,
        baseURL?: string,
        modelName?: string,
        orgId?: string
    ): Promise<string> {
        if (baseURL || modelName || orgId) {
            return this.model(image, prompt, apiKey, baseURL, modelName, orgId);
        }
        if (apiKey) {
            return this.model(image, prompt, apiKey);
        }
        return this.model(image, prompt);
    }
}
