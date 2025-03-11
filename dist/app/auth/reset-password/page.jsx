"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reset_password_form_1 = require("../../../components/auth/reset-password-form");
const page = () => {
    return (<div className="flex flex-col w-full min-h-full items-center justify-center">
			<reset_password_form_1.ResetPasswordForm />
		</div>);
};
exports.default = page;
