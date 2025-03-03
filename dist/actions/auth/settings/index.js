"use strict";
"use server";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeSettings = void 0;
const auth_1 = require("@/auth");
const prisma_1 = require("@/lib/prisma");
const auth_2 = require("@/schemas/auth");
const services_1 = require("@/services");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_3 = require("@/auth");
/**
 * This method saves the user's new settings
 * @param {z.infer<typeof UserSettingsSchema>} user - The new user data.
 * @returns {Promise<{error?: string, success?: string}>} The result of the settings change request.
 */
const changeSettings = async (settings) => {
    const validData = auth_2.UserSettingsSchema.safeParse(settings);
    if (!validData.success) {
        return {
            error: "Dados inválidos",
        };
    }
    const session = await (0, auth_1.auth)();
    if (!(session === null || session === void 0 ? void 0 : session.user) || !(session === null || session === void 0 ? void 0 : session.user.id)) {
        return {
            error: "Conecte-se para atualizar seus dados",
        };
    }
    const userData = await (0, services_1.findUserbyId)(session === null || session === void 0 ? void 0 : session.user.id);
    if (!userData) {
        return {
            error: "Usuário não encontrado",
        };
    }
    //TODO: Add e-mail verification to enable two factor authentication
    const { password, newPassword } = validData.data;
    if (password && newPassword && (userData === null || userData === void 0 ? void 0 : userData.password)) {
        const validPassword = bcryptjs_1.default.compare(password, userData.password);
        if (!validPassword) {
            return {
                error: "Senha atual incorreta",
            };
        }
        settings.newPassword = undefined;
        settings.password = await bcryptjs_1.default.hash(newPassword, 10);
    }
    settings.email = undefined;
    // settings.isTwoFactorEnabled = undefined;
    try {
        const updatedUser = await prisma_1.prisma.user.update({
            data: Object.assign({}, settings),
            where: {
                id: userData.id,
            },
        });
        await (0, auth_3.update)({
            user: Object.assign(Object.assign({}, session.user), { name: updatedUser.name, isTwoFactorEnabled: updatedUser.isTwoFactorAuthEnabled }),
        });
        return {
            success: "Perfil atualizado",
        };
    }
    catch (error) {
        return {
            error: "Algo deu errado",
        };
    }
};
exports.changeSettings = changeSettings;
