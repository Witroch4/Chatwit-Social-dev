"use strict";
//components/auth/register-form.tsx
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RegisterForm;
const button_1 = require("../../components/ui/button");
const input_1 = require("../../components/ui/input");
const zod_1 = require("@hookform/resolvers/zod");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const react_hook_form_1 = require("react-hook-form");
const auth_1 = require("../../actions/auth");
const form_1 = require("../../components/ui/form");
const auth_2 = require("../../schemas/auth");
const auth_card_1 = __importDefault(require("./auth-card"));
const auth_form_message_1 = __importDefault(require("./auth-form-message"));
function RegisterForm() {
    const router = (0, navigation_1.useRouter)();
    const [isPending, startTransition] = (0, react_1.useTransition)();
    const [error, setError] = (0, react_1.useState)("");
    const [success, setSuccess] = (0, react_1.useState)("");
    const form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(auth_2.RegisterSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    });
    const onSubmit = async (values) => {
        startTransition(async () => {
            try {
                const { success, error } = await (0, auth_1.register)(values);
                if (error)
                    setError(error);
                setSuccess(success || "");
                form.reset();
            }
            catch (error) {
                setSuccess("");
                setError("Algo deu errado.");
                form.reset();
            }
        });
    };
    return (<auth_card_1.default title="Registre-se" description="Seja bem-vindo">
			<div className="space-y-4">
				<form_1.Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<div className="space-y-4">
							<form_1.FormField control={form.control} name="name" render={({ field }) => (<form_1.FormItem>
										<form_1.FormLabel>Name</form_1.FormLabel>
										<form_1.FormControl>
											<input_1.Input autoComplete="off" type="name" placeholder="Jose da Silva" required {...field} disabled={isPending}/>
										</form_1.FormControl>
										<form_1.FormDescription className="hidden">Seu nome.</form_1.FormDescription>
										<form_1.FormMessage />
									</form_1.FormItem>)}/>
							<form_1.FormField control={form.control} name="email" render={({ field }) => (<form_1.FormItem>
										<form_1.FormLabel>E-mail</form_1.FormLabel>
										<form_1.FormControl>
											<input_1.Input type="email" placeholder="voce@provedor.com.br" required {...field} disabled={isPending}/>
										</form_1.FormControl>
										<form_1.FormDescription className="hidden">Seu e-mail.</form_1.FormDescription>
										<form_1.FormMessage />
									</form_1.FormItem>)}/>
							<form_1.FormField control={form.control} name="password" render={({ field }) => (<form_1.FormItem>
										<form_1.FormLabel>Senha</form_1.FormLabel>
										<form_1.FormControl>
											<input_1.Input type="password" placeholder="******" required {...field} disabled={isPending}/>
										</form_1.FormControl>
										<form_1.FormDescription className="hidden">Seu e-mail.</form_1.FormDescription>
										<form_1.FormMessage />
									</form_1.FormItem>)}/>
							{error && <auth_form_message_1.default type="error" message={error} title="Erro"/>}
							{success && <auth_form_message_1.default type="success" message={success} title="Sucesso"/>}
							<button_1.Button variant={"default"} className="w-full" disabled={isPending}>
								<lucide_react_1.LoaderIcon className={!isPending ? "hidden" : "animate-spin mr-2"}/>
								<span>Registrar</span>
							</button_1.Button>
						</div>
					</form>
				</form_1.Form>

				<div className="mt-4 text-center text-sm">
					Já tem uma conta?{" "}
					<link_1.default href="/auth/login" className="underline">
						Efetue Login
					</link_1.default>
				</div>
			</div>
		</auth_card_1.default>);
}
