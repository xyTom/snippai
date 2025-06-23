import { models } from "../lib/models";

export default class aiModel {
    model: any;

    private constructor(model: any) {
        this.model = model;
    }

    static async create(model: string) {
        let importPath = "";
        //check if the model is in the list
        if (models.find((m) => m.value === model)) {
            importPath = models.find((m) => m.value === model).modelScript;
        } else {
            importPath = "gemini";
        }
        // Use extensionless path so the correct compiled file is loaded
        const module = await import(`./model-${importPath}`);
        return new aiModel(module.default);
    }

    async run(prompt: string, image: string, apiKey?:string, baseURL?:string) {
        if (apiKey) {
            if (baseURL) {
                return this.model(prompt, image, apiKey, baseURL);
            }
            return this.model(prompt, image, apiKey);
        }
        return this.model(prompt, image);
    }
}