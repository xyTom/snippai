import React from "react";
import { Skeleton } from "./ui/skeleton";

export default function SkeletonCard() {
  return (
    <div className="flex flex-col space-y-3 pt-2 pr-4 pb-4 pl-4 h-full flex-1 overflow-hidden">
      <Skeleton className="h-full w-full min-h-[130px] flex-1 rounded-xl mb-2" />
      {/* <div className="space-y-2">
        <Skeleton className="h-5 w-[32rem]" />
        <Skeleton className="h-5 w-[28rem]" />
      </div> */}
    </div>
  );
}
