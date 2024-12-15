//auth.config.ts
import bcryptjs from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { InvalidCredentials, UserNotFound } from "./lib/auth";
import { CredentialsSchema } from "./schemas/auth";
import { findUserbyEmail } from "./services";
import GitHub from "next-auth/providers/github";
import Facebook from "next-auth/providers/facebook";

export default {
	providers: [
		Credentials({
			async authorize(credentials) {
				const validdCredentials = CredentialsSchema.safeParse(credentials);
				if (validdCredentials.success) {
					const { email, password } = validdCredentials.data;
					const user = await findUserbyEmail(email);
					if (!user || !user.password) {
						throw new UserNotFound();
					}
					const validPassword = await bcryptjs.compare(password, user.password);
					if (validPassword) return user;
				}
				//TODO: Would it be better to throw new InvalidCredential?
				return null;
			},
		}),
		  Google({
			clientId: process.env.AUTH_GOOGLE_ID!,
			clientSecret: process.env.AUTH_GOOGLE_SECRET!,
		  }),
		  GitHub({
			clientId: process.env.AUTH_GITHUB_ID!,
			clientSecret: process.env.AUTH_GITHUB_SECRET!,
		  }),
		  Facebook({
			clientId: process.env.FACEBOOK_CLIENT_ID!,
			clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
		  }),
		],
} satisfies NextAuthConfig;
