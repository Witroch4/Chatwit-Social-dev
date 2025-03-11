"use strict";
"use server";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.sendAccountVerificationEmail = void 0;
const prisma_1 = require("../../../lib/prisma");
const mail_1 = __importDefault(require("../../../lib/mail"));
const services_1 = require("../../../services");
const auth_1 = require("../../../services/auth");
/**
 * This method uses Resend to send an email to the user to verify
 * the ownership of the email by the user.
 *
 * @param {User} user - The user to send the verification email to.
 * @param {string} token - The verification token.
 * @returns {Promise<{ error?: string, success?: string }>} An object indicating the result of the operation.
 */
const sendAccountVerificationEmail = async (user, token) => {
    const { RESEND_EMAIL_FROM, VERIFICATION_SUBJECT, NEXT_PUBLIC_URL, VERIFICATION_URL } = process.env;
    if (!RESEND_EMAIL_FROM || !VERIFICATION_SUBJECT || !NEXT_PUBLIC_URL || !VERIFICATION_URL) {
        return {
            error: "Configuração de ambiente insuficiente para envio de e-mail.",
        };
    }
    const verificationUrl = `${NEXT_PUBLIC_URL}${VERIFICATION_URL}?token=${token}`;
    const { email } = user;
    try {
        const { data, error } = await mail_1.default.emails.send({
            from: RESEND_EMAIL_FROM,
            to: email,
            subject: VERIFICATION_SUBJECT,
            html: `<p>Clique <a href="${verificationUrl}">aqui</a> para confirmar seu e-mail.</p>`,
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
exports.sendAccountVerificationEmail = sendAccountVerificationEmail;
/**
 * This method updates the user's record with the date the email was verified.
 *
 * @param {string} token - The verification token.
 * @returns {Promise<{ error?: string, success?: string }>} An object indicating the result of the operation.
 */
const verifyToken = async (token) => {
    const existingToken = await (0, auth_1.findVerificationTokenbyToken)(token);
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
                emailVerified: new Date(),
            },
        });
        await prisma_1.prisma.verificationToken.delete({
            where: {
                id: existingToken.id,
            },
        });
        return {
            success: "E-mail verificado",
        };
    }
    catch (err) {
        return { error: "Erro ao atualizar verificação de e-mail" };
    }
};
exports.verifyToken = verifyToken;
