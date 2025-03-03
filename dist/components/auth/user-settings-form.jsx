"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserSettingsForm;
const settings_1 = require("@/actions/auth/settings");
const button_1 = require("@/components/ui/button");
const form_1 = require("@/components/ui/form");
const input_1 = require("@/components/ui/input");
const auth_1 = require("@/schemas/auth");
const zod_1 = require("@hookform/resolvers/zod");
const lucide_react_1 = require("lucide-react");
const react_1 = require("next-auth/react");
const link_1 = __importDefault(require("next/link"));
const react_2 = require("react");
const react_hook_form_1 = require("react-hook-form");
const card_1 = require("../ui/card");
const separator_1 = require("../ui/separator");
const switch_1 = require("../ui/switch");
const auth_form_message_1 = __importDefault(require("./auth-form-message"));
function UserSettingsForm({ user }) {
    const { update } = (0, react_1.useSession)();
    const [isPending, startTransition] = (0, react_2.useTransition)();
    const [error, setError] = (0, react_2.useState)("");
    const [success, setSuccess] = (0, react_2.useState)("");
    const form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(auth_1.UserSettingsSchema),
        defaultValues: {
            name: (user === null || user === void 0 ? void 0 : user.name) || undefined,
            email: (user === null || user === void 0 ? void 0 : user.email) || undefined,
            password: undefined,
            newPassword: undefined,
            //@ts-ignore
            isTwoFactorAuthEnabled: !!(user === null || user === void 0 ? void 0 : user.isTwoFactorEnabled),
        },
    });
    const onSubmit = async (values) => {
        startTransition(async () => {
            try {
                const resp = await (0, settings_1.changeSettings)(values);
                const { success, error } = resp;
                if (!resp) {
                    setError("Resposta inválida do servidor");
                    setSuccess("");
                    form.reset();
                    return;
                }
                if (error) {
                    setError(error);
                    setSuccess("");
                    return;
                }
                if (success) {
                    setSuccess(success);
                    setError("");
                    update();
                    return;
                }
            }
            catch (error) {
                setSuccess("");
                setError("Algo deu errado.");
                form.reset();
            }
        });
    };
    return (<card_1.Card x-chunk="dashboard-04-chunk-1">
			<card_1.CardHeader>
				<card_1.CardTitle>Dados do Usuário</card_1.CardTitle>
				<card_1.CardDescription>Suas informações</card_1.CardDescription>
			</card_1.CardHeader>
			<card_1.CardContent>
				<div className="space-y-4">
					<form_1.Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)}>
							<div className="space-y-4">
								<form_1.FormField control={form.control} name="name" render={({ field }) => (<form_1.FormItem>
											<form_1.FormLabel>Name</form_1.FormLabel>
											<form_1.FormControl>
												<input_1.Input autoComplete="off" type="name" placeholder="Jose da Silva" {...field} disabled={isPending}/>
											</form_1.FormControl>
											<form_1.FormDescription className="hidden">Seu nome.</form_1.FormDescription>
											<form_1.FormMessage />
										</form_1.FormItem>)}/>
								<form_1.FormField control={form.control} name="email" render={({ field }) => (<form_1.FormItem>
											<form_1.FormLabel>E-mail</form_1.FormLabel>
											<form_1.FormControl>
												<input_1.Input type="email" placeholder="voce@provedor.com.br" {...field} disabled/>
											</form_1.FormControl>
											<form_1.FormDescription className="hidden">Seu e-mail.</form_1.FormDescription>
											<form_1.FormMessage />
										</form_1.FormItem>)}/>
								<form_1.FormField control={form.control} name="password" render={({ field }) => (<form_1.FormItem>
											<form_1.FormLabel>Senha</form_1.FormLabel>
											<form_1.FormControl>
												<input_1.Input type="password" placeholder="******" {...field} disabled={isPending}/>
											</form_1.FormControl>
											<form_1.FormDescription className="hidden">Seu e-mail.</form_1.FormDescription>
											<form_1.FormMessage />
										</form_1.FormItem>)}/>
								<form_1.FormField control={form.control} name="newPassword" render={({ field }) => (<form_1.FormItem>
											<form_1.FormLabel>Nova senha</form_1.FormLabel>
											<form_1.FormControl>
												<input_1.Input type="password" placeholder="******" {...field} disabled={isPending}/>
											</form_1.FormControl>
											<form_1.FormDescription className="hidden">Seu e-mail.</form_1.FormDescription>
											<form_1.FormMessage />
										</form_1.FormItem>)}/>

								<form_1.FormField control={form.control} name="isTwoFactorAuthEnabled" render={({ field }) => (<form_1.FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 m-2 space-x-2">
											<lucide_react_1.ShieldAlert className="text-yellow-400"/>
											<form_1.FormLabel className="flex-1 space-y-1">
												<p className="text-sm font-medium leading-none">Autenticação de 2 Fatores</p>
												<p className="text-sm text-muted-foreground">Deixe sua conta mais segura</p>
											</form_1.FormLabel>
											<form_1.FormControl>
												<switch_1.Switch checked={field.value} onCheckedChange={field.onChange}/>
											</form_1.FormControl>
										</form_1.FormItem>)}/>

								{error && <auth_form_message_1.default type="error" message={error} title="Erro"/>}
								{success && <auth_form_message_1.default type="success" message={success} title="Sucesso"/>}
								<separator_1.Separator />
								<div className="w-full flex justify-end items-center">
									<button_1.Button variant={"default"} disabled={isPending}>
										<lucide_react_1.LoaderIcon className={!isPending ? "hidden" : "animate-spin mr-2"}/>
										<span>Salvar</span>
									</button_1.Button>
								</div>
							</div>
						</form>
					</form_1.Form>

					<div className="mt-4 text-center text-sm">
						<link_1.default href="/" className="underline">
							Página Inicial
						</link_1.default>
					</div>
				</div>
			</card_1.CardContent>
		</card_1.Card>);
}
