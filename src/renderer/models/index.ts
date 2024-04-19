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
        const module = await import(`./model-${importPath}.ts`);
        return new aiModel(module.default);
    }

    async run(prompt: string, image: string) {
        return this.model(prompt, image);
    }
}