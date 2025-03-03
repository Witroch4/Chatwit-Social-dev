"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoadingState;
// app/dashboard/automação/components/LoadingState.tsx
const skeleton_1 = require("@/components/ui/skeleton");
function LoadingState() {
    return (<div style={{ padding: "2rem 1rem", maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
      <skeleton_1.Skeleton className="h-[125px] w-[250px] rounded-xl mb-6"/>
      <skeleton_1.Skeleton className="h-4 w-[150px] mb-2"/>
      <skeleton_1.Skeleton className="h-4 w-[100px] mb-6"/>
      <div className="space-y-4">
        <skeleton_1.Skeleton className="h-[125px] w-[250px] rounded-xl"/>
        <skeleton_1.Skeleton className="h-[125px] w-[250px] rounded-xl"/>
      </div>
    </div>);
}
