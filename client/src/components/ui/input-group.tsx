import React from "react";
import { cn } from "@/lib/utils";

interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function InputGroup({ className, children, ...props }: InputGroupProps) {
  return (
    <div className={cn("relative", className)} {...props}>
      {children}
    </div>
  );
}