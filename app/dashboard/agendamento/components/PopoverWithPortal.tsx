// components/agendamento/PopoverWithPortal.tsx
"use client";

import React from "react";
import ReactDOM from "react-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PopoverWithPortalProps {
  children: React.ReactNode;
  content: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PopoverWithPortal: React.FC<PopoverWithPortalProps> = ({
  children,
  content,
  open,
  onOpenChange,
}) => {
  if (typeof document === "undefined") {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      {open &&
        ReactDOM.createPortal(
          <PopoverContent className="w-40 p-2 z-50" align="start">
            {content}
          </PopoverContent>,
          document.body
        )}
    </Popover>
  );
};

export default PopoverWithPortal;
