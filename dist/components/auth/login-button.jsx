"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("next-auth/react");
const LoginButton = ({ children }) => {
    return (
    // biome-ignore lint: reason
    <div onClick={async () => {
            (0, react_1.signIn)();
        }}>
			{children}
		</div>);
};
exports.default = LoginButton;
