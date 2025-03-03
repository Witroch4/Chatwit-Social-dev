"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PaymentConfirmationLayout;
// app/(checkout)/payment-confirmation/layout.tsx
const react_1 = __importDefault(require("react"));
const image_1 = __importDefault(require("next/image"));
function PaymentConfirmationLayout({ children, }) {
    return (<div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <header className="mb-8">
        {/* Exibe sua logo; ajuste os valores de width e height conforme necessário */}
        <image_1.default src="/ChatWit.svg" alt="ChatWit Logo" width={150} height={50}/>
      </header>
      <main className="w-full max-w-md bg-white p-6 rounded-lg shadow">
        {children}
      </main>
    </div>);
}
