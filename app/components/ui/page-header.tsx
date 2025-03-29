import { cn } from "@/lib/utils";
import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-2 px-4 sm:px-6 lg:px-8 py-8 bg-background", className)}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      {description && (
        <p className="text-muted-foreground max-w-4xl">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
} 