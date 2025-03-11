"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginForm;
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const button_1 = require("../../components/ui/button");
const input_1 = require("../../components/ui/input");
const auth_card_1 = __importDefault(require("./auth-card"));
const zod_1 = require("@hookform/resolvers/zod");
const react_hook_form_1 = require("react-hook-form");
const auth_1 = require("../../actions/auth");
const form_1 = require("../../components/ui/form");
const input_otp_1 = require("../../components/ui/input-otp");
const auth_2 = require("../../schemas/auth");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const separator_1 = require("../ui/separator");
const auth_form_message_1 = __importDefault(require("./auth-form-message"));
const social_login_1 = __importDefault(require("./social-login"));
function LoginForm() {
    const [isPending, startTransition] = (0, react_1.useTransition)();
    const [error, setError] = (0, react_1.useState)("");
    const [success, setSuccess] = (0, react_1.useState)("");
    const [showOTPForm, setShowOTP] = (0, react_1.useState)(false);
    const searchParams = (0, navigation_1.useSearchParams)();
    const callbackError = searchParams
        ? searchParams.get("error") === "OAuthAccountNotLinked"
            ? "E-mail em uso com provedor diferente"
            : undefined
        : undefined;
    const form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(auth_2.CredentialsSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });
    const onSubmit = async (values) => {
        startTransition(async () => {
            try {
                const resp = await (0, auth_1.login)(values);
                if (!resp) {
                    setError("Resposta inválida do servidor");
                    setSuccess("");
                    form.reset();
                    return;
                }
                const { error, success, data } = resp;
                if (data === null || data === void 0 ? void 0 : data.twoFactorAuthEnabled) {
                    setShowOTP(true);
                    if (resp.error) {
                        setError(resp.error);
                        setSuccess("");
                        return;
                    }
                    return;
                }
                if (error) {
                    setError(resp.error);
                    setSuccess("");
                    form.reset();
                    return;
                }
                if (success) {
                    setSuccess(resp.success);
                    setError("");
                    return;
                }
                form.reset();
            }
            catch (err) {
                setError("Algo deu errado");
                setSuccess("");
                form.reset();
            }
        });
    };
    return (<auth_card_1.default title="Conecte-se" description="Seja bem-vindo novamente">
			<div className="space-y-4">
				<form_1.Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						{!showOTPForm && (<div className="space-y-4">
								<form_1.FormField control={form.control} name="email" render={({ field }) => (<form_1.FormItem>
											<form_1.FormLabel>{"E-mail"}</form_1.FormLabel>
											<form_1.FormControl>
												<input_1.Input type="email" placeholder="voce@provedor.com.br" required {...field} disabled={isPending}/>
											</form_1.FormControl>
											<form_1.FormDescription className="hidden">{"Seu e-mail."}</form_1.FormDescription>
											<form_1.FormMessage />
										</form_1.FormItem>)}/>
								<form_1.FormField control={form.control} name="password" render={({ field }) => (<form_1.FormItem>
											<form_1.FormLabel>{"Senha"}</form_1.FormLabel>
											<form_1.FormControl>
												<div>
													<input_1.Input type="password" placeholder="******" required {...field} disabled={isPending}/>
													<div className="flex items-center">
														<link_1.default href="/auth/reset-password" className="ml-auto inline-block text-sm text-secondary-foreground underline">
															{"Esqueceu a senha?"}
														</link_1.default>
													</div>
												</div>
											</form_1.FormControl>
											<form_1.FormDescription className="hidden">{"Seu e-mail."}</form_1.FormDescription>
											<form_1.FormMessage />
										</form_1.FormItem>)}/>
								{callbackError && <auth_form_message_1.default type="error" message={callbackError} title="Erro"/>}
								{error && <auth_form_message_1.default type="error" message={error} title="Erro"/>}
								{success && <auth_form_message_1.default type="success" message={success} title="Sucesso"/>}
								<button_1.Button variant={"default"} className="w-full" disabled={isPending}>
									<lucide_react_1.LoaderIcon className={!isPending ? "hidden" : "animate-spin mr-2"}/>
									<span>{"Conectar"}</span>
								</button_1.Button>
							</div>)}
						{showOTPForm && (<div className="space-y-4">
								<form_1.FormField control={form.control} name="code" render={({ field }) => (<form_1.FormItem>
											<form_1.FormLabel>{"Código"}</form_1.FormLabel>
											<form_1.FormControl>
												<input_otp_1.InputOTP maxLength={6} {...field}>
													<input_otp_1.InputOTPGroup>
														<input_otp_1.InputOTPSlot index={0}/>
														<input_otp_1.InputOTPSlot index={1}/>
														<input_otp_1.InputOTPSlot index={2}/>
													</input_otp_1.InputOTPGroup>
													<input_otp_1.InputOTPGroup>
														<input_otp_1.InputOTPSlot index={3}/>
														<input_otp_1.InputOTPSlot index={4}/>
														<input_otp_1.InputOTPSlot index={5}/>
													</input_otp_1.InputOTPGroup>
												</input_otp_1.InputOTP>
											</form_1.FormControl>
											<form_1.FormDescription>{"Favor entrar com o códio enviado por e-mail"}</form_1.FormDescription>
											<form_1.FormMessage />
										</form_1.FormItem>)}/>
								{error && <auth_form_message_1.default type="error" message={error} title="Erro"/>}
								<button_1.Button variant={"default"} className="w-full" disabled={isPending}>
									<lucide_react_1.LoaderIcon className={!isPending ? "hidden" : "animate-spin mr-2"}/>
									<span>{"Validar"}</span>
								</button_1.Button>
							</div>)}
					</form>
				</form_1.Form>

				<separator_1.Separator />
				<social_login_1.default />

				{!showOTPForm && (<div className="mt-4 text-center text-sm">
						{"Não tem uma conta?"}{" "}
						<link_1.default href="/auth/register" className="underline">
							{"Cadastre-se"}
						</link_1.default>
					</div>)}
				{showOTPForm && (<div className="mt-4 text-center text-sm">
						{"Conectar agora?"}{" "}
						<link_1.default href="/auth/login" className="underline">
							{"Conectar"}
						</link_1.default>
					</div>)}
			</div>
		</auth_card_1.default>);
}
