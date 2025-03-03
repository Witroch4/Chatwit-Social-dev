"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = exports.signOut = exports.signIn = exports.auth = exports.POST = exports.GET = void 0;
// auth.ts
const prisma_adapter_1 = require("@auth/prisma-adapter");
const next_auth_1 = __importDefault(require("next-auth"));
const auth_config_1 = __importDefault(require("./auth.config"));
const prisma_1 = require("./lib/prisma");
const services_1 = require("./services");
const auth_1 = require("./services/auth");
_a = (0, next_auth_1.default)(Object.assign({ adapter: (0, prisma_adapter_1.PrismaAdapter)(prisma_1.prisma), 
    // 1. Defina explicitamente o secret
    secret: process.env.AUTH_SECRET, session: {
        strategy: "jwt",
    }, pages: {
        signIn: "/auth/login",
    }, callbacks: {
        async signIn({ user, email, account, profile }) {
            if (account && (account.provider === "google" || account.provider === "github")) {
                return true;
            }
            if (user.email) {
                console.log("Requisição Prisma: Buscando usuário por email durante sign-in");
                const registeredUser = await (0, services_1.findUserbyEmail)(user.email);
                if (!(registeredUser === null || registeredUser === void 0 ? void 0 : registeredUser.emailVerified))
                    return false;
            }
            return true;
        },
        async jwt({ token, user, trigger, session }) {
            var _a;
            console.log("Início do callback JWT:", { trigger });
            // Atualização do token quando há um gatilho específico (ex.: atualização de perfil)
            if (trigger === "update" && session) {
                console.log("Atualizando token com base na sessão");
                // Remover 'instagramExpiresAt'
                token.isTwoFactorEnabled = session.user.isTwoFactorEnabled;
                token.instagramAccessToken = session.user.instagramAccessToken;
                // Adicionar 'providerAccountId'
                if (session.user.providerAccountId) {
                    token.providerAccountId = session.user.providerAccountId;
                }
                return token;
            }
            // Caso seja o primeiro login (user está definido)
            if (user) {
                console.log("Usuário detectado durante sign-in:", user);
                // Requisição para verificar se a autenticação de dois fatores está habilitada
                console.log("Requisição Prisma: Buscando status de autenticação de dois fatores");
                if (!user.id) {
                    throw new Error("User id não definido");
                }
                const isTwoFactorEnabled = await (0, auth_1.isTwoFactorAutenticationEnabled)(user.id);
                token.isTwoFactorEnabled = isTwoFactorEnabled;
                // Requisição para buscar a conta do Instagram
                console.log("Requisição Prisma: Buscando conta do Instagram");
                const instagramAccount = await prisma_1.prisma.account.findFirst({
                    where: {
                        userId: user.id, // user.id ou token.sub (ambos referem-se ao mesmo usuário)
                        provider: "instagram",
                    },
                });
                if (instagramAccount) {
                    console.log("Conta do Instagram encontrada:", instagramAccount);
                    token.instagramAccessToken = (_a = instagramAccount.access_token) !== null && _a !== void 0 ? _a : undefined;
                    // Remover a atribuição de 'instagramExpiresAt'
                    // token.instagramExpiresAt = instagramAccount.expires_at ?? undefined;
                    // Adicionar 'providerAccountId'
                    token.providerAccountId = instagramAccount.providerAccountId;
                }
                else {
                    console.log("Nenhuma conta do Instagram encontrada.");
                    token.instagramAccessToken = undefined;
                    // Remover a atribuição de 'instagramExpiresAt'
                    // token.instagramExpiresAt = undefined;
                    token.providerAccountId = undefined;
                }
                token.role = user.role;
                console.log("Usuário COM A ROLE:", token.role);
            }
            // Caso não seja sign-in nem update, não faz nenhuma consulta ao banco
            console.log("Token final antes de retornar:", token);
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub;
                session.user.isTwoFactorEnabled = token.isTwoFactorEnabled;
                session.user.role = token.role;
                // Incluir o token do Instagram na sessão, se disponível
                session.user.instagramAccessToken = token.instagramAccessToken;
                // Remover 'instagramExpiresAt'
                // session.user.instagramExpiresAt = token.instagramExpiresAt as number | undefined;
                // Incluir 'providerAccountId' na sessão, se disponível
                session.user.providerAccountId = token.providerAccountId;
            }
            return session;
        },
    } }, auth_config_1.default)), _b = _a.handlers, exports.GET = _b.GET, exports.POST = _b.POST, exports.auth = _a.auth, exports.signIn = _a.signIn, exports.signOut = _a.signOut, exports.update = _a.unstable_update;
