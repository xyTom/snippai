import React from "react"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import { promptOptions } from "../lib/models"

export default function promptSelect(props: { handlePromptChange: Function, model: string}) {
    const options = promptOptions as { [key: string]: { value: string; label: string; prompt: string; }[] };
    return (
        <Tabs defaultValue="Auto" onValueChange={(value) => props.handlePromptChange(value)}>
            <TabsList>
                {options[props.model].map((prompt,index) => (
                    <TabsTrigger key={index} value={prompt.value}>{prompt.label}</TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
        
    )
}

