"use strict";
// app/dashboard/automação/components/ErrorState.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ErrorState;
function ErrorState({ error }) {
    return (<div style={{ padding: "2rem 1rem", maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
        <p style={{ color: "red" }}>{error}</p>
      </div>);
}
