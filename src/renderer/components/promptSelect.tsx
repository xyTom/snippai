import React from "react"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"


export default function promptSelect(props: { handlePromptChange: Function }) {
    return (
        <Tabs defaultValue="Auto" onValueChange={(value) => props.handlePromptChange(value)}>
            <TabsList>
                <TabsTrigger value="Auto">Auto</TabsTrigger>
                <TabsTrigger value="Formula">Formula</TabsTrigger>
                <TabsTrigger value="Text">Text</TabsTrigger>
                <TabsTrigger value="Table">Table</TabsTrigger>
                <TabsTrigger value="Image">Image</TabsTrigger>
                <TabsTrigger value="Solve">Solve</TabsTrigger>
                <TabsTrigger value="Custom">Custom Prompt</TabsTrigger>
            </TabsList>
        </Tabs>
        
    )
}

