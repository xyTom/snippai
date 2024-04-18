import { models } from "../lib/models";
export default class aiModel {
    model: any;
    constructor(model:string) {
        this.selectModel(model);
    }
    async selectModel(model:string) {
        let importPath = "";
        //check if the model is in the list
        if (models.find((m) => m.value === model)) {
            importPath = models.find((m) => m.value === model).modelScript;
        } else {
            importPath = "gemini";
        }
        this.model = import(`./${importPath}.ts`);
       
    }

    async run(prompt:string, image:string) {
        return this.model(prompt, image);
    }
}