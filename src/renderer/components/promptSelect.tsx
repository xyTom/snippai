import React from "react"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import { promptOptions } from "../lib/models"

export default function promptSelect(props: { handlePromptChange: Function }) {
    return (
        <Tabs defaultValue="Auto" onValueChange={(value) => props.handlePromptChange(value)}>
            <TabsList>
                {promptOptions.map((prompt) => (
                    <TabsTrigger value={prompt.value}>{prompt.label}</TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
        
    )
}

