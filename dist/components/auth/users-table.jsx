"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UsersTable;
const lucide_react_1 = require("lucide-react");
const button_1 = require("../../components/ui/button");
const card_1 = require("../../components/ui/card");
const dropdown_menu_1 = require("../../components/ui/dropdown-menu");
const table_1 = require("../../components/ui/table");
const dialog_1 = require("../../components/ui/dialog");
const react_1 = require("react");
function UsersTable({ users }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    return (<card_1.Card>
            <card_1.CardHeader>
                <card_1.CardTitle>Usuários</card_1.CardTitle>
                <card_1.CardDescription>
                    Gerencie seus usuários
                </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent>
                <table_1.Table>
                    <table_1.TableHeader>
                        <table_1.TableRow>
                            <table_1.TableHead>Name</table_1.TableHead>
                            <table_1.TableHead>Email</table_1.TableHead>
                            <table_1.TableHead>Verificado</table_1.TableHead>
                            <table_1.TableHead>Role</table_1.TableHead>
                            <table_1.TableHead>2FA Habilidato</table_1.TableHead>
                            <table_1.TableHead>2FA Verificicado</table_1.TableHead>
                            <table_1.TableHead>
                                <span className="sr-only">Ações</span>
                            </table_1.TableHead>
                        </table_1.TableRow>
                    </table_1.TableHeader>
                    <table_1.TableBody>
                        {users.length > 0 && users.map(({ id, name, email, emailVerified, role, twoFactorAuthVerified, isTwoFactorAuthEnabled, createdAt }) => (<table_1.TableRow key={id}>
                                    <table_1.TableCell>{name}</table_1.TableCell>
                                    <table_1.TableCell>{email}</table_1.TableCell>
                                    <table_1.TableCell>{emailVerified ? <lucide_react_1.Check color="#22c55e"/> : <lucide_react_1.ShieldAlert color="#eab308"/>}</table_1.TableCell>
                                    <table_1.TableCell>{role}</table_1.TableCell>
                                    <table_1.TableCell>{isTwoFactorAuthEnabled ? <lucide_react_1.Check color="#22c55e" className=""/> : <lucide_react_1.ShieldX color="#eab308"/>}</table_1.TableCell>
                                    <table_1.TableCell>{twoFactorAuthVerified ? <lucide_react_1.Check /> : <lucide_react_1.ShieldAlert color="#eab308"/>}</table_1.TableCell>
                                    <table_1.TableCell>
                                        <dialog_1.Dialog open={open} onOpenChange={setOpen}>
                                            <dropdown_menu_1.DropdownMenu>
                                                <dropdown_menu_1.DropdownMenuTrigger asChild>
                                                    <button_1.Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <lucide_react_1.MoreHorizontal className="h-4 w-4"/>
                                                        <span className="sr-only">Toggle menu</span>
                                                    </button_1.Button>
                                                </dropdown_menu_1.DropdownMenuTrigger>
                                                <dropdown_menu_1.DropdownMenuContent align="end">
                                                    <dropdown_menu_1.DropdownMenuLabel>Actions</dropdown_menu_1.DropdownMenuLabel>
                                                    <dialog_1.DialogTrigger asChild>
                                                        <dropdown_menu_1.DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                            Solicitar Mudança de senha
                                                        </dropdown_menu_1.DropdownMenuItem>
                                                    </dialog_1.DialogTrigger>
                                                    <dropdown_menu_1.DropdownMenuItem>Delete</dropdown_menu_1.DropdownMenuItem>
                                                </dropdown_menu_1.DropdownMenuContent>
                                            </dropdown_menu_1.DropdownMenu>
                                            <dialog_1.DialogContent className="sm:max-w-[425px]">
                                                <dialog_1.DialogHeader>
                                                    <dialog_1.DialogTitle>Solicitação Mudança de senha</dialog_1.DialogTitle>
                                                    <dialog_1.DialogDescription>
                                                        Um E-mail será enviado para que o usuário mude sua senha.
                                                    </dialog_1.DialogDescription>
                                                </dialog_1.DialogHeader>
                                            </dialog_1.DialogContent>
                                        </dialog_1.Dialog>
                                    </table_1.TableCell>
                                </table_1.TableRow>))}
                    </table_1.TableBody>
                </table_1.Table>
            </card_1.CardContent>
            <card_1.CardFooter>
                <div className="text-xs text-muted-foreground">
                    Showing <strong>1-10</strong> of <strong>32</strong> products
                </div>
            </card_1.CardFooter>
        </card_1.Card>);
}
