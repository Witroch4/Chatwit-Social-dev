"use strict";
// app/dashboard/layout.tsx
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardLayout;
const react_1 = __importDefault(require("react"));
const sidebar_1 = require("../../components/ui/sidebar");
const conditional_sidebar_1 = __importDefault(require("../../components/conditional-sidebar"));
const navbar_1 = __importDefault(require("../../components/navbar"));
function DashboardLayout({ children, }) {
    return (<sidebar_1.SidebarProvider>
      <div className="flex h-full min-h-screen">
        <conditional_sidebar_1.default />
        <navbar_1.default />
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </sidebar_1.SidebarProvider>);
}
