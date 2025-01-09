import { prisma } from "@/lib/prisma";
export const getUsers = async () => {
	const users = await prisma.user.findMany();
	return users;
};
