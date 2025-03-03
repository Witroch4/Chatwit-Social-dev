"use strict";
"use server";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const prisma_1 = require("@/lib/prisma");
const auth_1 = require("@/schemas/auth");
const auth_2 = require("@/services/auth");
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const email_verification_1 = require("../email-verification");
/**
 * This method creates the user for Credentials provider
 * @param {z.infer<typeof RegisterSchema>} user - The new user data.
 * @returns {Promise<{error?: string, success?: string}>} The result of the password change request.
 */
const register = async (user) => {
    const valid = await auth_1.RegisterSchema.safeParse(user);
    if (!valid.success) {
        return {
            error: "Dados inválidos",
        };
    }
    try {
        const { name, email, password } = user;
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const createdUser = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: client_1.UserRole.DEFAULT,
            },
        });
        //Account verification flow with e-mail
        const verificationToken = await (0, auth_2.createVerificationToken)(email);
        await (0, email_verification_1.sendAccountVerificationEmail)(createdUser, verificationToken.token);
        return {
            success: "E-mail de verificação enviado",
        };
    }
    catch (error) {
        if (error instanceof library_1.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return {
                    error: "Já existe uma conta relacionada a este e-mail.",
                };
            }
        }
        // return { error };
        throw error;
    }
};
exports.register = register;
