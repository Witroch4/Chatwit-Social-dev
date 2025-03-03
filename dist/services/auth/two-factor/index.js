"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTwoFactorAuthToken = exports.findTwoFactorAuthTokeByToken = exports.deleteTwoFactorAuthTokenById = exports.isTwoFactorAutenticationEnabled = exports.findTwoFactorAuthTokenByEmail = void 0;
const prisma_1 = require("@/lib/prisma");
const utils_1 = require("@/lib/utils");
const findTwoFactorAuthTokenByEmail = async (email) => {
    const token = await prisma_1.prisma.twoFactorToken.findUnique({
        where: {
            email,
        },
    });
    return token;
};
exports.findTwoFactorAuthTokenByEmail = findTwoFactorAuthTokenByEmail;
const isTwoFactorAutenticationEnabled = async (id) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: {
            id,
        },
        select: {
            isTwoFactorAuthEnabled: true,
        },
    });
    return user === null || user === void 0 ? void 0 : user.isTwoFactorAuthEnabled;
};
exports.isTwoFactorAutenticationEnabled = isTwoFactorAutenticationEnabled;
const deleteTwoFactorAuthTokenById = async (id) => {
    const token = await prisma_1.prisma.twoFactorToken.delete({
        where: {
            id,
        },
    });
    return token;
};
exports.deleteTwoFactorAuthTokenById = deleteTwoFactorAuthTokenById;
const findTwoFactorAuthTokeByToken = async (token) => {
    const existingToken = await prisma_1.prisma.twoFactorToken.findUnique({
        where: {
            token,
        },
    });
    return existingToken;
};
exports.findTwoFactorAuthTokeByToken = findTwoFactorAuthTokeByToken;
const createTwoFactorAuthToken = async (email) => {
    const token = (0, utils_1.generateOTP)(6);
    const expires = new Date(new Date().getTime() + 2 * 60 * 60 * 1000); //two hours
    const existingToken = await (0, exports.findTwoFactorAuthTokenByEmail)(email);
    if (existingToken) {
        await (0, exports.deleteTwoFactorAuthTokenById)(existingToken.id);
    }
    const twoFactorAuthToken = await prisma_1.prisma.twoFactorToken.create({
        data: {
            email,
            token,
            expires,
        },
    });
    return twoFactorAuthToken;
};
exports.createTwoFactorAuthToken = createTwoFactorAuthToken;
