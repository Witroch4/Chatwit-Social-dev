"use strict";
"use server";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.sendResetPasswordEmail = exports.resetPassword = void 0;
const mail_1 = __importDefault(require("@/lib/mail"));
const auth_1 = require("@/schemas/auth");
const services_1 = require("@/services");
const auth_2 = require("@/services/auth");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * This method initiates the reset password process
 * @param {z.infer<typeof ResetPasswordSchema>} values - The values for resetting the password.
 * @returns {Promise<{error?: string, success?: string}>} The result of the reset password request.
 */
const resetPassword = async (values) => {
    const validatedEmail = auth_1.ResetPasswordSchema.safeParse(values);
    if (!validatedEmail.success) {
        return { error: "E-mail inválido" };
    }
    const { email } = validatedEmail.data;
    const existingUser = await (0, services_1.findUserbyEmail)(email);
    if (!existingUser) {
        return { error: "Usuário não encontrado" };
    }
    const resetPasswordToken = await (0, auth_2.createResetPasswordToken)(email);
    await (0, exports.sendResetPasswordEmail)(resetPasswordToken.email, resetPasswordToken.token);
    return { success: "E-mail de mudança de senha enviado" };
};
exports.resetPassword = resetPassword;
/**
 * This method uses Resend to send an e-mail to change the user's password
 * @param {string} email - The user's email.
 * @param {string} token - The reset password token.
 * @returns {Promise<{error?: string, success?: string}>} The result of the email sending request.
 */
const sendResetPasswordEmail = async (email, token) => {
    const { NEXT_PUBLIC_URL, RESEND_EMAIL_FROM, RESET_PASSWORD_SUBJECT, RESET_PASSWORD_URL } = process.env;
    if (!NEXT_PUBLIC_URL || !RESEND_EMAIL_FROM || !RESET_PASSWORD_SUBJECT || !RESET_PASSWORD_URL) {
        return { error: "Configuração de ambiente insuficiente para envio de e-mail." };
    }
    const resetUrl = `${NEXT_PUBLIC_URL}${RESET_PASSWORD_URL}?token=${token}`;
    const { data, error } = await mail_1.default.emails.send({
        from: RESEND_EMAIL_FROM,
        to: email,
        subject: RESET_PASSWORD_SUBJECT,
        html: `<p>Clique <a href="${resetUrl}">aqui</a> para modificar sua senha.</p>`,
    });
    if (error)
        return {
            error,
        };
    return {
        success: "E-mail enviado com sucesso",
    };
};
exports.sendResetPasswordEmail = sendResetPasswordEmail;
/**
 * This method updates the user's password
 * @param {z.infer<typeof NewPasswordSchema>} passwordData - The new password data.
 * @param {string | null} token - The reset password token.
 * @returns {Promise<{error?: string, success?: string}>} The result of the password change request.
 */
const changePassword = async (passwordData, token) => {
    if (!token) {
        return { error: "Token não encontrado" };
    }
    const validatedPassword = auth_1.NewPasswordSchema.safeParse(passwordData);
    if (!validatedPassword.success) {
        return { error: "Dados inválidos" };
    }
    const { password } = validatedPassword.data;
    const existingToken = await (0, auth_2.findResetPasswordTokenByToken)(token);
    if (!existingToken) {
        return { error: "Token inválido" };
    }
    const hasExpired = new Date(existingToken.expires) < new Date();
    if (hasExpired) {
        return { error: "Token Expirado" };
    }
    const existingUser = await (0, services_1.findUserbyEmail)(existingToken.email);
    if (!existingUser) {
        return { error: "Usuário não encontrado" };
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    await (0, auth_2.updatePassword)(existingUser.id, hashedPassword);
    await (0, auth_2.deleteResetPasswordToken)(existingToken.id);
    return { success: "Senha atualizada" };
};
exports.changePassword = changePassword;
