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

export default function LanguageInput(props: { language: string, onLanguageSave: (language: string) => void, open: boolean, onOpenChange: (value: boolean) => void }) {
    const [language, setLanguage] = React.useState(props.language);
    const [open, setOpen] = React.useState(props.open);
    
    const onLanguageChange = (value: string) => {
        setLanguage(value);
    }
    
    // 添加一个共用的保存语言函数
    const saveLanguage = () => {
        if (language.length > 0) {
            props.onLanguageSave(language)
            setOpen(false)
        } else {
            alert("Please enter a valid language")
        }
    }
    
    //when setOpen is called, update the parent state
    React.useEffect(() => {
        props.onOpenChange(open);
    }, [open]);
    
    //when the parent state is updated, update the local state
    React.useEffect(() => {
        setOpen(props.open);
    }, [props.open]);
    
    //when the parent language is updated, update the local state
    React.useEffect(() => {
        setLanguage(props.language);
    }, [props.language]);
    
    return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Please set your language</DialogTitle>
                <DialogDescription>
                    Please enter the language you want the AI to answer in (e.g. 中文, English, 日本語, etc.)
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="language" className="text-right">
                        Language
                    </Label>
                    <Input 
                        id="language" 
                        value={language} 
                        className="col-span-3" 
                        onChange={(event) => onLanguageChange((event.target as HTMLInputElement).value)}
                        placeholder="e.g. 中文, English, 日本語, etc."
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                saveLanguage()
                            }
                        }}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button type="submit"
                    onClick={() => {
                        saveLanguage()
                    }}
                >
                    Save
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>)
} 