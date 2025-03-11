"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangePasswordForm = void 0;
const zod_1 = require("@hookform/resolvers/zod");
const react_1 = require("react");
const react_hook_form_1 = require("react-hook-form");
const auth_1 = require("../../actions/auth");
const button_1 = require("../../components/ui/button");
const form_1 = require("../../components/ui/form");
const input_1 = require("../../components/ui/input");
const auth_2 = require("../../schemas/auth");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const auth_card_1 = __importDefault(require("./auth-card"));
const auth_form_message_1 = __importDefault(require("./auth-form-message"));
const ChangePasswordForm = () => {
    const [error, setError] = (0, react_1.useState)("");
    const [success, setSuccess] = (0, react_1.useState)("");
    const [isPending, startTransition] = (0, react_1.useTransition)();
    const searchParams = (0, navigation_1.useSearchParams)();
    if (!searchParams || !searchParams.has("token"))
        return null;
    const token = searchParams.get("token");
    const form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(auth_2.NewPasswordSchema),
        defaultValues: {
            password: "",
        },
    });
    const onSubmit = (values) => {
        setError("");
        setSuccess("");
        startTransition(async () => {
            try {
                const { success, error } = await (0, auth_1.changePassword)(values, token);
                if (error)
                    setError(error);
                setSuccess(success || "");
                form.reset();
            }
            catch (err) {
                setSuccess("");
                setError("Algo deu errado.");
                form.reset();
            }
        });
    };
    return (<auth_card_1.default title="Modifique sua senha" description="Escolha uma nova senha">
			<form_1.Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<div className="space-y-4">
						<form_1.FormField control={form.control} name="password" render={({ field }) => (<form_1.FormItem>
									<form_1.FormLabel>Nova senha</form_1.FormLabel>
									<form_1.FormControl>
										<input_1.Input {...field} disabled={isPending} placeholder="******" type="password"/>
									</form_1.FormControl>
									<form_1.FormMessage />
								</form_1.FormItem>)}/>
					</div>
					{error && <auth_form_message_1.default type="error" message={error} title="Erro"/>}
					{success && <auth_form_message_1.default type="success" message={success} title="Sucesso"/>}

					<button_1.Button variant={"default"} className="w-full" disabled={isPending}>
						<lucide_react_1.LoaderIcon className={!isPending ? "hidden" : "animate-spin mr-2"}/>
						<span>Mudar senha</span>
					</button_1.Button>
				</form>
			</form_1.Form>
			<div className="mt-4 text-center text-sm">
				Gostaria de conectar-se?{" "}
				<link_1.default href="/auth/login" className="underline">
					Conectar agora
				</link_1.default>
			</div>
		</auth_card_1.default>);
};
exports.ChangePasswordForm = ChangePasswordForm;
