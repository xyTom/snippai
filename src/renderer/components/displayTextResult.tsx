
import { Textarea } from "@/renderer/components/ui/textarea"
import { Button } from "@/renderer/components/ui/button"
import React from "react"

export default function displayTextResult() {
  return (
    <div className="grid w-full max-w-sm gap-2">
      <div className="relative">
        <Textarea placeholder="Enter some text" />
        <Button className="absolute top-1 right-1" size="icon" variant="outline">
          <ClipboardCheckIcon className="w-4 h-4" />
          <span className="sr-only">Copy</span>
        </Button>
      </div>
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
      stroke="currentColor"
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
