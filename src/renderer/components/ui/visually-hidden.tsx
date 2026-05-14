import * as React from "react";
import { cn } from "../../../renderer/lib/utils";

type VisuallyHiddenProps = React.HTMLAttributes<HTMLSpanElement>

const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "absolute h-px w-px p-0 overflow-hidden whitespace-nowrap border-0",
          // This ensures the element is visually hidden but still accessible to screen readers
          "clip-rect-0 -m-px",
          className
        )}
        {...props}
      />
    );
  }
);

VisuallyHidden.displayName = "VisuallyHidden";

export { VisuallyHidden };
