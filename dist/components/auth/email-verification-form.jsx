"use strict";
//components/auth/email-verification-form.tsx
"use client";
//components/auth/email-verification-form.tsx
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("@/actions/auth");
const navigation_1 = require("next/navigation");
const react_1 = __importStar(require("react"));
const auth_card_1 = __importDefault(require("./auth-card"));
const auth_form_message_1 = __importDefault(require("./auth-form-message"));
const EmailVerificationForm = () => {
    const [error, setError] = (0, react_1.useState)(undefined);
    const [success, setSuccess] = (0, react_1.useState)(undefined);
    const searchParams = (0, navigation_1.useSearchParams)();
    if (!searchParams || !searchParams.has("token"))
        return null;
    const token = searchParams.get("token");
    const automaticSubmission = (0, react_1.useCallback)(() => {
        if (error || success)
            return;
        if (!token) {
            setError("Token inválido");
            return;
        }
        (0, auth_1.verifyToken)(token)
            .then((data) => {
            setSuccess(data.success);
            setError(data.error);
        })
            .catch(() => {
            setError("Algo deu errado");
        });
    }, [token, success, error]);
    (0, react_1.useEffect)(() => {
        automaticSubmission();
    }, [automaticSubmission]);
    return (<div className="flex flex-1 justify-center items-center">
			<auth_card_1.default title="Verifique seu E-mail">
				{success && <auth_form_message_1.default title="Sucesso" type="success" message={success}/>}
				{error && <auth_form_message_1.default title="Encontramos um problema" type="error" message={error}/>}
			</auth_card_1.default>
		</div>);
};
exports.default = EmailVerificationForm;
