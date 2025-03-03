"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = void 0;
const prisma_1 = require("@/lib/prisma");
const getUsers = async () => {
    const users = await prisma_1.prisma.user.findMany();
    return users;
};
exports.getUsers = getUsers;
