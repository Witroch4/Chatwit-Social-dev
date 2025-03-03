"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSidebar = AppSidebar;
const react_1 = require("next-auth/react");
const skeleton_1 = require("@/components/ui/skeleton");
const login_badge_1 = __importDefault(require("@/components/auth/login-badge"));
const lucide_react_1 = require("lucide-react");
const sidebar_1 = require("@/components/ui/sidebar");
const link_1 = __importDefault(require("next/link"));
const avatar_1 = require("@/components/ui/avatar");
const dropdown_menu_1 = require("@/components/ui/dropdown-menu");
const collapsible_1 = require("@/components/ui/collapsible");
const dotlottie_react_1 = require("@lottiefiles/dotlottie-react");
const next_themes_1 = require("next-themes");
const image_1 = __importDefault(require("next/image"));
function AppSidebar() {
    var _a, _b, _c, _d, _e;
    const { data: session, status } = (0, react_1.useSession)();
    const { state } = (0, sidebar_1.useSidebar)(); // Hook para saber se a sidebar está "collapsed" ou "open"
    const { toggleSidebar } = (0, sidebar_1.useSidebar)();
    const isLoading = status === "loading";
    // URL de autorização com enable_fb_login=0 e force_authentication=1
    const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI)}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish`;
    const isInstagramConnected = !!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.instagramAccessToken);
    const { theme } = (0, next_themes_1.useTheme)();
    const instagramAnimationSrc = theme === "dark"
        ? "/animations/logodarckInstagram.lottie"
        : "/animations/logolightInstagram.lottie";
    // Função para desconectar o Instagram
    async function handleInstagramLogout() {
        try {
            const res = await fetch("/auth/instagram/disconnect", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (res.ok) {
                // Recarrega a página para atualizar o estado da sessão
                window.location.reload();
            }
            else {
                const errorData = await res.json();
                console.error("Falha ao desconectar do Instagram:", errorData);
                alert("Falha ao desconectar do Instagram.");
            }
        }
        catch (error) {
            console.error("Erro ao desconectar do Instagram:", error);
            alert("Ocorreu um erro ao tentar desconectar do Instagram.");
        }
    }
    // Carregamento Inicial
    if (isLoading) {
        return (<sidebar_1.Sidebar collapsible="icon" side="left" variant="sidebar">
        <sidebar_1.SidebarContent>
          {/* Placeholder de carregamento */}
          <div className="p-4 space-y-6">
            <skeleton_1.Skeleton className="h-[125px] w-full rounded-xl"/>
            <div className="space-y-4">
              <skeleton_1.Skeleton className="h-4 w-3/4"/>
              <skeleton_1.Skeleton className="h-4 w-2/3"/>
              <skeleton_1.Skeleton className="h-4 w-full"/>
              <skeleton_1.Skeleton className="h-4 w-1/2"/>
            </div>
            <div className="space-y-6">
              <skeleton_1.Skeleton className="h-12 w-full rounded-lg"/>
              <skeleton_1.Skeleton className="h-12 w-full rounded-lg"/>
              <skeleton_1.Skeleton className="h-12 w-full rounded-lg"/>
            </div>
          </div>
        </sidebar_1.SidebarContent>
        <sidebar_1.SidebarFooter>
          <div className="p-4">
            <skeleton_1.Skeleton className="h-10 w-full rounded-lg"/>
          </div>
        </sidebar_1.SidebarFooter>
      </sidebar_1.Sidebar>);
    }
    return (<sidebar_1.Sidebar collapsible="icon" side="left" variant="sidebar">
      <sidebar_1.SidebarContent>
        {/* Grupo Social Login */}
        <collapsible_1.Collapsible defaultOpen={false} className="group/collapsible">
          <sidebar_1.SidebarGroup>
            <div className={`flex items-center justify-center p-2 relative ${state === "collapsed" ? "flex-col space-y-1" : "flex-row"}`}>
              <collapsible_1.CollapsibleTrigger className="flex items-center justify-center cursor-pointer">
                <image_1.default src="/W.svg" alt="Logo Social Login" width={state === "collapsed" ? 30 : 20} height={state === "collapsed" ? 30 : 20} className={`transition-all duration-300 ${state === "collapsed" ? "mx-auto" : "mr-2"}`}/>
                {/* MOSTRA o texto "Social Login" apenas se a sidebar NÃO estiver colapsada */}
                {state !== "collapsed" && (<span className="ml-2">Social Login</span>)}
                {/* MOSTRA a animação do Instagram apenas se conectado e NÃO estiver colapsada */}
                {isInstagramConnected && state !== "collapsed" && (<dotlottie_react_1.DotLottieReact src={instagramAnimationSrc} autoplay loop={false} style={{
                width: "16px",
                height: "16px",
                marginLeft: "0.5rem",
            }} aria-label="Instagram conectado"/>)}
                {/* Ícone de Chevron para indicar colapso/expansão */}
                <lucide_react_1.ChevronDown className={`ml-auto transition-transform duration-300 ${state === "collapsed" ? "hidden" : "inline-block"} group-data-[state=open]/collapsible:rotate-180`}/>
              </collapsible_1.CollapsibleTrigger>
            </div>

            <collapsible_1.CollapsibleContent>
              <sidebar_1.SidebarGroupContent>
                <div className="p-4">
                  {/* Se não está conectado, mostra botão de login do Instagram */}
                  {!isInstagramConnected && (<>
                      <p className="text-lg font-bold mb-2">
                        Para continuar, faça login com sua rede social e
                        autorize o acesso.
                      </p>
                      <sidebar_1.SidebarMenu>
                        <sidebar_1.SidebarMenuItem>
                          <sidebar_1.SidebarMenuButton asChild>
                            <a href={instagramAuthUrl} className="flex items-center gap-2">
                              <lucide_react_1.Instagram className={`mr-2 ${isInstagramConnected
                ? "text-pink-500"
                : "text-current"}`}/>
                              <span>Login com Instagram</span>
                            </a>
                          </sidebar_1.SidebarMenuButton>
                        </sidebar_1.SidebarMenuItem>
                      </sidebar_1.SidebarMenu>
                    </>)}

                  {/* Se já está conectado ao Instagram, mostra a animação */}
                  {isInstagramConnected && (<div className="mt-4 flex flex-col items-center">
                      <dotlottie_react_1.DotLottieReact src={instagramAnimationSrc} autoplay style={{ width: "60px", height: "60px" }}/>
                      <p className="text-center mt-2">
                        Instagram conectado e pronto para chamadas API.
                      </p>
                       {/* Botão de Sair do Instagram */}
                       <button onClick={handleInstagramLogout} className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
                        <lucide_react_1.Instagram className="w-5 h-5"/>
                        <span>Sair do Instagram</span>
                      </button>
                    </div>)}
                </div>
              </sidebar_1.SidebarGroupContent>
            </collapsible_1.CollapsibleContent>
          </sidebar_1.SidebarGroup>
        </collapsible_1.Collapsible>

        {/* Grupo: Admin (visível somente para usuários ADMIN) */}
        {((_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.role) === "ADMIN" && (<collapsible_1.Collapsible defaultOpen={false} className="group/collapsible">
            <sidebar_1.SidebarGroup>
              <div className={`flex items-center justify-center p-2 relative ${state === "collapsed" ? "flex-col space-y-1" : "flex-row"}`}>
                <collapsible_1.CollapsibleTrigger className="flex items-center justify-center cursor-pointer">
                  {/* Ícone para o grupo Admin */}
                  <lucide_react_1.HelpCircle className={`transition-all duration-300 ${state === "collapsed" ? "mx-auto" : "mr-2"}`}/>
                  {/* Texto "Admin" apenas se a sidebar NÃO estiver colapsada */}
                  {state !== "collapsed" && (<span className="ml-2 font-bold">Admin</span>)}
                  {/* Chevron para colapso/expansão */}
                  <lucide_react_1.ChevronDown className={`ml-auto transition-transform duration-300 ${state === "collapsed" ? "hidden" : "inline-block"} group-data-[state=open]/collapsible:rotate-180`}/>
                </collapsible_1.CollapsibleTrigger>
              </div>

              <collapsible_1.CollapsibleContent>
                <sidebar_1.SidebarGroupContent>
                  <sidebar_1.SidebarMenu>
                    {/* /admin/queues */}
                    <sidebar_1.SidebarMenuItem>
                      <sidebar_1.SidebarMenuButton asChild>
                        <link_1.default href="/admin/queue" className={`flex items-center ${state === "collapsed"
                ? "justify-start pl-4"
                : "justify-start pl-2"}`}>
                          <lucide_react_1.Calendar className="mr-2"/>
                          {state !== "collapsed" && <span>Admin Queue</span>}
                        </link_1.default>
                      </sidebar_1.SidebarMenuButton>
                    </sidebar_1.SidebarMenuItem>

                    {/* /dashboard/calendario */}
                    <sidebar_1.SidebarMenuItem>
                      <sidebar_1.SidebarMenuButton asChild>
                        <link_1.default href="/dashboard/calendario" className={`flex items-center ${state === "collapsed"
                ? "justify-start pl-4"
                : "justify-start pl-2"}`}>
                          <lucide_react_1.Users className="mr-2"/>
                          {state !== "collapsed" && <span>Admin User</span>}
                        </link_1.default>
                      </sidebar_1.SidebarMenuButton>
                    </sidebar_1.SidebarMenuItem>

                    {/* /api/auth/get-token */}
                    <sidebar_1.SidebarMenuItem>
                      <sidebar_1.SidebarMenuButton asChild>
                        <link_1.default href="/api/auth/get-token" className={`flex items-center ${state === "collapsed"
                ? "justify-start pl-4"
                : "justify-start pl-2"}`}>
                          <lucide_react_1.MessageCircle className="mr-2"/>
                          {state !== "collapsed" && (<span>API Auth Get Token</span>)}
                        </link_1.default>
                      </sidebar_1.SidebarMenuButton>
                    </sidebar_1.SidebarMenuItem>

                    {/* /auth/users */}
                    <sidebar_1.SidebarMenuItem>
                      <sidebar_1.SidebarMenuButton asChild>
                        <link_1.default href="/auth/users" className={`flex items-center ${state === "collapsed"
                ? "justify-start pl-4"
                : "justify-start pl-2"}`}>
                          <lucide_react_1.User2 className="mr-2"/>
                          {state !== "collapsed" && <span>Auth Users</span>}
                        </link_1.default>
                      </sidebar_1.SidebarMenuButton>
                    </sidebar_1.SidebarMenuItem>
                  </sidebar_1.SidebarMenu>
                </sidebar_1.SidebarGroupContent>
              </collapsible_1.CollapsibleContent>
            </sidebar_1.SidebarGroup>
          </collapsible_1.Collapsible>)}

        {/* Contatos */}
        <sidebar_1.SidebarGroup>
          <sidebar_1.SidebarGroupContent>
            <sidebar_1.SidebarMenu>
              <sidebar_1.SidebarMenuItem>
                <sidebar_1.SidebarMenuButton asChild>
                  <link_1.default href="/contatos" className={`flex items-center ${state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"}`}>
                    <lucide_react_1.Users className="mr-2"/>
                    {state !== "collapsed" && <span>Contatos</span>}
                  </link_1.default>
                </sidebar_1.SidebarMenuButton>
              </sidebar_1.SidebarMenuItem>
            </sidebar_1.SidebarMenu>
          </sidebar_1.SidebarGroupContent>
        </sidebar_1.SidebarGroup>

        {/* Agendamento */}
        <sidebar_1.SidebarGroup>
          <sidebar_1.SidebarGroupContent>
            <sidebar_1.SidebarMenu>
              <sidebar_1.SidebarMenuItem>
                <sidebar_1.SidebarMenuButton asChild>
                  <link_1.default href="/dashboard/agendamento" className={`flex items-center ${state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"}`}>
                    <lucide_react_1.Zap className="mr-2"/>
                    {state !== "collapsed" && <span>Agendamento de Postagens</span>}
                  </link_1.default>
                </sidebar_1.SidebarMenuButton>
              </sidebar_1.SidebarMenuItem>
            </sidebar_1.SidebarMenu>
          </sidebar_1.SidebarGroupContent>
        </sidebar_1.SidebarGroup>

        {/* Calendário */}
        <sidebar_1.SidebarGroup>
          <sidebar_1.SidebarGroupContent>
            <sidebar_1.SidebarMenu>
              <sidebar_1.SidebarMenuItem>
                <sidebar_1.SidebarMenuButton asChild>
                  <link_1.default href="/dashboard/calendario" className={`flex items-center ${state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"}`}>
                    <lucide_react_1.Calendar className="mr-2"/>
                    {state !== "collapsed" && <span>Calendários</span>}
                  </link_1.default>
                </sidebar_1.SidebarMenuButton>
              </sidebar_1.SidebarMenuItem>
            </sidebar_1.SidebarMenu>
          </sidebar_1.SidebarGroupContent>
        </sidebar_1.SidebarGroup>

        {/* Automação */}
        <sidebar_1.SidebarGroup>
          <sidebar_1.SidebarGroupContent>
            <sidebar_1.SidebarMenu>
              <sidebar_1.SidebarMenuItem>
                <sidebar_1.SidebarMenuButton asChild>
                  <link_1.default href="/dashboard/automacao" className={`flex items-center ${state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"}`}>
                    <lucide_react_1.Atom className="mr-2"/>
                    {state !== "collapsed" && <span>Automação</span>}
                  </link_1.default>
                </sidebar_1.SidebarMenuButton>
              </sidebar_1.SidebarMenuItem>
            </sidebar_1.SidebarMenu>
          </sidebar_1.SidebarGroupContent>
        </sidebar_1.SidebarGroup>

        {/* Chat ao Vivo */}
        <sidebar_1.SidebarGroup>
          <sidebar_1.SidebarGroupContent>
            <sidebar_1.SidebarMenu>
              <sidebar_1.SidebarMenuItem>
                <sidebar_1.SidebarMenuButton asChild>
                  <link_1.default href="chatwit" className={`flex items-center ${state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"}`}>
                    <lucide_react_1.MessageCircle className="mr-2"/>
                    {state !== "collapsed" && <span>Chat ao Vivos</span>}
                  </link_1.default>
                </sidebar_1.SidebarMenuButton>
              </sidebar_1.SidebarMenuItem>
            </sidebar_1.SidebarMenu>
          </sidebar_1.SidebarGroupContent>
        </sidebar_1.SidebarGroup>

        {/* Ajuda (Docs) */}
        <sidebar_1.SidebarGroup>
          <sidebar_1.SidebarGroupContent>
            <sidebar_1.SidebarMenu>
              <sidebar_1.SidebarMenuItem>
                <sidebar_1.SidebarMenuButton asChild>
                  <link_1.default href="/docs" className={`flex items-center ${state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"}`}>
                    <lucide_react_1.HelpCircle className="mr-2"/>
                    {state !== "collapsed" && <span>Ajuda (Docs)</span>}
                  </link_1.default>
                </sidebar_1.SidebarMenuButton>
              </sidebar_1.SidebarMenuItem>
            </sidebar_1.SidebarMenu>
          </sidebar_1.SidebarGroupContent>
        </sidebar_1.SidebarGroup>
      </sidebar_1.SidebarContent>

      <sidebar_1.SidebarFooter>
        <div className="p-4">
          <dropdown_menu_1.DropdownMenu>
            <dropdown_menu_1.DropdownMenuTrigger asChild>
              <button className={`flex items-center w-full px-2 py-1 hover:bg-accent rounded ${(session === null || session === void 0 ? void 0 : session.user) && state === "collapsed"
            ? "justify-center"
            : "justify-start pl-2"}`}>
                {((_c = session === null || session === void 0 ? void 0 : session.user) === null || _c === void 0 ? void 0 : _c.image) ? (<avatar_1.Avatar className="h-6 w-6">
                    <avatar_1.AvatarImage src={session.user.image}/>
                    <avatar_1.AvatarFallback>
                      <lucide_react_1.CircleUser className="h-4 w-4"/>
                    </avatar_1.AvatarFallback>
                  </avatar_1.Avatar>) : (<lucide_react_1.User2 className="h-6 w-6"/>)}
                {/* Ocultar o nome do usuário se a sidebar estiver colapsada */}
                {state !== "collapsed" && (<span className="ml-2">
                    {(_e = (_d = session === null || session === void 0 ? void 0 : session.user) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : "Minha Conta"}
                  </span>)}
              </button>
            </dropdown_menu_1.DropdownMenuTrigger>
            <dropdown_menu_1.DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
              <login_badge_1.default user={session === null || session === void 0 ? void 0 : session.user}/>
            </dropdown_menu_1.DropdownMenuContent>
          </dropdown_menu_1.DropdownMenu>
        </div>
      </sidebar_1.SidebarFooter>
    </sidebar_1.Sidebar>);
}
