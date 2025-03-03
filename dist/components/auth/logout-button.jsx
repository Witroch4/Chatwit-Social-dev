"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("next-auth/react");
const LogoutButton = ({ children }) => {
    return (
    // biome-ignore lint: reason
    <div onClick={async () => {
            await (0, react_1.signOut)();
        }}>
			{children}
		</div>);
};
exports.default = LogoutButton;
