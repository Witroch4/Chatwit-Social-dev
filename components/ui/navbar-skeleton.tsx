"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function NavbarSkeleton() {
  return (
    <header className="sticky top-0 left-0 right-0 h-16 border-b bg-background z-40">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center">
          <Skeleton className="h-8 w-8 mr-2 rounded-md" />
          <Skeleton className="w-32 h-6 rounded-md hidden md:block" />
        </div>

        <div className="flex items-center space-x-4">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
    </header>
  );
}