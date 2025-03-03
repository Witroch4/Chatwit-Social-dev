"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Settings;
const link_1 = __importDefault(require("next/link"));
const auth_1 = require("@/auth");
const user_settings_form_1 = __importDefault(require("@/components/auth/user-settings-form"));
async function Settings() {
    const session = await (0, auth_1.auth)();
    return (<div className="flex min-h-screen w-full flex-col">
			<main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
				<div className="mx-auto grid w-full max-w-6xl gap-2">
					<h1 className="text-3xl font-semibold">Settings</h1>
				</div>
				<div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
					<nav className="grid gap-4 text-sm text-muted-foreground" x-chunk="dashboard-04-chunk-0">
						<link_1.default href="#" className="font-semibold text-primary">
							Geral
						</link_1.default>
						<link_1.default href="#">Support</link_1.default>
						<link_1.default href="#">Advanced</link_1.default>
					</nav>
					<div className="grid gap-6">
						<user_settings_form_1.default user={session === null || session === void 0 ? void 0 : session.user}/>
					</div>
				</div>
			</main>
		</div>);
}
