"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const email_verification_form_1 = __importDefault(require("@/components/auth/email-verification-form"));
const react_1 = require("react");
const VerifyEmail = () => {
    return (<div className="flex flex-col w-full min-h-full items-center justify-center">
			<react_1.Suspense>
				<email_verification_form_1.default />
			</react_1.Suspense>
		</div>);
};
exports.default = VerifyEmail;
