"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const register_form_1 = __importDefault(require("@/components/auth/register-form"));
const Login = async () => {
    return (<div className="flex flex-col w-full min-h-full items-center justify-center">
			<register_form_1.default />
		</div>);
};
exports.default = Login;
