"use strict";
//components\auth\login-social-button.tsx
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
const button_1 = require("@/components/ui/button");
const react_1 = require("next-auth/react");
const LoginSocialButton = ({ children, provider, callbackUrl }) => {
    return (<button_1.Button variant={"outline"} size={"default"} onClick={async () => {
            (0, react_1.signIn)(provider, { redirect: true, callbackUrl });
        }}>
      {children}
    </button_1.Button>);
};
exports.default = LoginSocialButton;
