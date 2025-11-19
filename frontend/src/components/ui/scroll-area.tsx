"use client";

import * as React from "react";
import * as RadixScrollArea from "@radix-ui/react-scroll-area";

interface ScrollAreaProps {
  className?: string;
  children: React.ReactNode;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({ className = "", children }) => {
  return (
    <RadixScrollArea.Root className={`relative overflow-hidden ${className}`}>
      <RadixScrollArea.Viewport className="w-full h-full">
        {children}
      </RadixScrollArea.Viewport>
      <RadixScrollArea.Scrollbar
        orientation="vertical"
        className="flex select-none touch-none p-1 bg-gray-200 rounded-full w-2"
      >
        <RadixScrollArea.Thumb className="flex-1 bg-gray-500 rounded-full" />
      </RadixScrollArea.Scrollbar>
      <RadixScrollArea.Corner className="bg-gray-200" />
    </RadixScrollArea.Root>
  );
};
