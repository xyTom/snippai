
import { Textarea } from "../../renderer/components/ui/textarea"
import { Button } from "../../renderer/components/ui/button"
import React from "react"

export default function displayTextResult(props: { text: string, onTextChange: (text: string) => void}) {
  const [copied, setCopied] = React.useState(false)
  console.log("displayTextResult", props.text)
  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log("handleTextChange", event.target.value)
    props.onTextChange(event.target.value)
  }
  const handleCopy = () => {
    console.log("handleCopy")
    navigator.clipboard.writeText(props.text)
    //display the check icon
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 1000)
  }
  return (
    <div className="grid w-full max-w-lg gap-2 min-h-60 pb-3">
      {/* <div className="relative"> */}
        <Textarea value={props.text} className="w-full text-lg antialiased font-medium" onChange={handleTextChange} />
        <Button 
        // className="absolute top-1 right-1" size="icon" 
          variant="outline" 
          onClick={handleCopy}>
          {copied ? <ClipboardCheckIcon className="w-5 h-5" /> :<ClipboardIcon className="w-5 h-5" /> }
          <span 
          // className="sr-only"
          > Copy</span>
        </Button>
      {/* </div> */}
    </div>
  )
}

function ClipboardCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="green"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  )
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="green"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ClipboardIcon (props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FFFFFF"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
  )
}