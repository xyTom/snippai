import React from "react"
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
import { models } from "../lib/models"

export default function displayTextResult(props: { apikey: string, onKeySave: (apikey: string) => void, open: boolean,onOpenChange: (value: boolean) => void, model: string}) {
    const [apiKey, setApiKey] = React.useState(props.apikey);
    const [baseURL, setBaseURL] = React.useState("");
    const [open, setOpen] = React.useState(props.open);
    const onKeyChange = (value: string) => {
        setApiKey(value);
    }
    const onBaseURLChange = (value: string) => {
        setBaseURL(value);
        //save the base URL to local storage
        localStorage.setItem(`${props.model}_baseURL`, value);
    }
    //read the base URL from local storage
    React.useEffect(() => {
        let baseURL = localStorage.getItem(`${props.model}_baseURL`);
        console.log(`${props.model}_baseURL`,baseURL);
        if (baseURL) {
            setBaseURL(baseURL);
        }
    }, [props.model]);
    //when setOpen is called, update the parent state
    React.useEffect(() => {
        props.onOpenChange(open);
    }, [open]);
    //when the parent state is updated, update the local state
    React.useEffect(() => {
        setOpen(props.open);
    }, [props.open]);
    //when the parent API key is updated, update the local state
    React.useEffect(() => {
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
                    {models.find((m) => m.value === props.model).requireBaseURL && (
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