import React from "react"
import { Skeleton } from "./ui/skeleton"

export default function SkeletonCard() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="min-h-56 w-[32rem] rounded-xl" />
      {/* <div className="space-y-2">
        <Skeleton className="h-5 w-[32rem]" />
        <Skeleton className="h-5 w-[28rem]" />
      </div> */}
    </div>
  )
}
