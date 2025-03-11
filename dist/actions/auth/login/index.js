"use strict";
//actions\auth\login\index.ts
"use server";
//actions\auth\login\index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const auth_1 = require("../../../auth");
const auth_2 = require("../../../schemas/auth");
const services_1 = require("../../../services");
const auth_3 = require("../../../services/auth");
const next_auth_1 = require("next-auth");
const email_verification_1 = require("../email-verification");
const two_factor_1 = require("../two-factor");
/**
 * This method is responsible for executing the login flow.
 * @param {z.infer<typeof CredentialsSchema>} credentials - The user credentials.
 * @returns {Promise<{ error?: string, success?: string, data?: { twoFactorAuthEnabled: boolean } }>}
 * An object containing error, success, or data about two-factor authentication status,
 * or throws an error if an unexpected error occurs.
 */
const login = async (credentials) => {
    const validCredentials = await auth_2.CredentialsSchema.safeParse(credentials);
    if (!validCredentials.success) {
        return {
            error: "Dados inválidos",
        };
    }
    try {
        const { email, password, code } = validCredentials.data;
        const user = await (0, services_1.findUserbyEmail)(email);
        if (!user) {
            return {
                error: "Usuário não encontrado",
            };
        }
        //Verificação de E-mail
        if (!user.emailVerified) {
            const verificationToken = await (0, auth_3.createVerificationToken)(user.email);
            await (0, email_verification_1.sendAccountVerificationEmail)(user, verificationToken.token);
            return {
                success: "Verificação de E-mail enviada com sucesso",
            };
        }
        //Two Factor Authentication
        if (user.isTwoFactorAuthEnabled) {
            if (code) {
                const twoFactorAuthToken = await (0, auth_3.findTwoFactorAuthTokenByEmail)(email);
                if (!twoFactorAuthToken || twoFactorAuthToken.token !== code) {
                    return {
                        error: "Código Inválido",
                        data: {
                            twoFactorAuthEnabled: true,
                        },
                    };
                }
                const hasExpired = new Date(twoFactorAuthToken.expires) < new Date();
                if (hasExpired) {
                    return {
                        error: "Código Expirado",
                        data: {
                            twoFactorAuthEnabled: true,
                        },
                    };
                }
                await (0, auth_3.deleteTwoFactorAuthTokenById)(twoFactorAuthToken.id);
            }
            else {
                //generate code
                const twoFactorAuthToken = await (0, auth_3.createTwoFactorAuthToken)(email);
                await (0, two_factor_1.sendTwoFactorAuthEmail)(user, twoFactorAuthToken.token);
                return {
                    data: {
                        twoFactorAuthEnabled: true,
                    },
                };
            }
        }
        const resp = await (0, auth_1.signIn)("credentials", {
            email,
            password,
            redirectTo: process.env.AUTH_LOGIN_REDIRECT,
        });
    }
    catch (err) {
        if (err instanceof next_auth_1.AuthError) {
            if (err instanceof next_auth_1.CredentialsSignin) {
                return {
                    error: "Credenciais inválidas",
                };
            }
        }
        throw err; // Rethrow all other errors
    }
};
exports.login = login;
