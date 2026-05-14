import React, { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../components/ui/dialog"
import { Label } from "../components/ui/label"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { getBaseModel } from "../lib/models"

export default function ApiKeyInput(props: { apikey: string, onKeySave: (apikey: string) => void, open: boolean,onOpenChange: (value: boolean) => void, model: string}) {
    const [apiKey, setApiKey] = useState(props.apikey);
    const [baseURL, setBaseURL] = useState("");
    const [open, setOpen] = useState(props.open);
    const requiresBaseURL = getBaseModel(props.model)?.requireBaseURL ?? false;
    const onKeyChange = (value: string) => {
        setApiKey(value);
    }
    const onBaseURLChange = (value: string) => {
        setBaseURL(value);
        //save the base URL to local storage
        localStorage.setItem(`${props.model}_baseURL`, value);
    }
    //read the base URL from local storage
    useEffect(() => {
        const baseURL = localStorage.getItem(`${props.model}_baseURL`);
        if (baseURL) {
            setBaseURL(baseURL);
        }
    }, [props.model]);
    //when setOpen is called, update the parent state
    useEffect(() => {
        props.onOpenChange(open);
    }, [open]);
    //when the parent state is updated, update the local state
    useEffect(() => {
        setOpen(props.open);
    }, [props.open]);
    //when the parent API key is updated, update the local state
    useEffect(() => {
        setApiKey(props.apikey);
    }
    , [props.apikey]);
    return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Please input your API key</DialogTitle>
                <DialogDescription>
                    This model requires an API key to use. Please input your API key below.
                </DialogDescription>
            </DialogHeader>
                    <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="apikey" className="text-right">
                        Your API Key
                    </Label>
                    <Input id="apikey" value={apiKey} className="col-span-3" 
                    onChange={(event) => onKeyChange((event.target as HTMLInputElement).value)}
                    />
                </div>
                    {requiresBaseURL && (
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="baseURL" className="text-right">
                        Base URL
                    </Label>
                    <Input id="baseURL" value={baseURL} className="col-span-3" 
                    onChange={(event) => onBaseURLChange((event.target as HTMLInputElement).value)}
                    />
                    </div>
                    )}
                
            </div>
        <DialogFooter>
        <Button type="submit"
        onClick={() => {
            if (apiKey.length > 0){
            props.onKeySave(apiKey)
            }else{
                alert("Please enter a valid API key")
            }
        }}>Save</Button>
        </DialogFooter>
        </DialogContent>
    </Dialog>)
}
