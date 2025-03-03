"use strict";
"use server";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTwoFactorToken = exports.sendTwoFactorAuthEmail = void 0;
const prisma_1 = require("@/lib/prisma");
const mail_1 = __importDefault(require("@/lib/mail"));
const services_1 = require("@/services");
const auth_1 = require("@/services/auth");
/**
 * This method sends an e-mail to the user with the 6 digits code to login
 * when Two Factor Authentication is enabled
 * @param {User} user
 * @param {string} token
 * @returns
 */
/**
 * This method sends an e-mail to the user with the 6 digits code to login
 * when Two Factor Authentication is enabled
 * @param {User} user - The user to send the verification email to.
 * @param {string} token - The verification token.
 * @returns {Promise<{ error?: string, success?: string }>} An object indicating the result of the operation.
 */
const sendTwoFactorAuthEmail = async (user, token) => {
    const { RESEND_EMAIL_FROM, OTP_SUBJECT } = process.env;
    if (!RESEND_EMAIL_FROM || !OTP_SUBJECT) {
        return {
            error: "Configuração de ambiente insuficiente para envio de e-mail.",
        };
    }
    const { email } = user;
    try {
        const { error } = await mail_1.default.emails.send({
            from: RESEND_EMAIL_FROM,
            to: email,
            subject: OTP_SUBJECT,
            html: `<p>Sue código OTP: ${token}</p>`,
        });
        if (error)
            return {
                error,
            };
        return {
            success: "E-mail enviado com sucesso",
        };
    }
    catch (error) {
        return { error };
    }
};
exports.sendTwoFactorAuthEmail = sendTwoFactorAuthEmail;
/**
 * This method updates the user's record with the date and time the
 * Two Factor Authentication was verified
 * @param token
 * @returns
 */
const verifyTwoFactorToken = async (token) => {
    const existingToken = await (0, auth_1.findTwoFactorAuthTokeByToken)(token);
    if (!existingToken) {
        return {
            error: "Código de verificação não encontrado",
        };
    }
    const isTokenExpired = new Date(existingToken.expires) < new Date();
    if (isTokenExpired) {
        return {
            error: "Código de verificação expirado",
        };
    }
    const user = await (0, services_1.findUserbyEmail)(existingToken.email);
    if (!user) {
        return {
            error: "Usuário não encontrado",
        };
    }
    try {
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorAuthVerified: new Date(),
            },
        });
        await prisma_1.prisma.twoFactorToken.delete({
            where: {
                id: existingToken.id,
            },
        });
        return {
            success: "Autênticação de dois fatores verificada",
        };
    }
    catch (err) {
        return { error: "Erro ao verificar o  código de autenticação de 2 fatores" };
    }
};
exports.verifyTwoFactorToken = verifyTwoFactorToken;
