import React from "react"
import { Skeleton } from "./ui/skeleton"

export default function SkeletonCard() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="min-h-56  min-w-60 w-[100%] rounded-xl mb-2" />
      {/* <div className="space-y-2">
        <Skeleton className="h-5 w-[32rem]" />
        <Skeleton className="h-5 w-[28rem]" />
      </div> */}
    </div>
  )
}
