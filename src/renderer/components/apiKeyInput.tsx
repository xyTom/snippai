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

export default function displayTextResult(props: { apikey: string, onKeySave: (apikey: string) => void, open: boolean,onOpenChange: (value: boolean) => void }) {
    const [apiKey, setApiKey] = React.useState(props.apikey);
    const [open, setOpen] = React.useState(props.open);
    const onKeyChange = (value: string) => {
        setApiKey(value);
    }
    //when setOpen is called, update the parent state
    React.useEffect(() => {
        props.onOpenChange(open);
    }, [open]);
    //when the parent state is updated, update the local state
    React.useEffect(() => {
        setOpen(props.open);
    }, [props.open]);

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