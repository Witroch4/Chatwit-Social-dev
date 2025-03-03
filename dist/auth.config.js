"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//auth.config.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const credentials_1 = __importDefault(require("next-auth/providers/credentials"));
const google_1 = __importDefault(require("next-auth/providers/google"));
const auth_1 = require("./lib/auth");
const auth_2 = require("./schemas/auth");
const services_1 = require("./services");
const github_1 = __importDefault(require("next-auth/providers/github"));
const facebook_1 = __importDefault(require("next-auth/providers/facebook"));
exports.default = {
    providers: [
        (0, credentials_1.default)({
            async authorize(credentials) {
                const validCredentials = auth_2.CredentialsSchema.safeParse(credentials);
                if (validCredentials.success) {
                    const { email, password } = validCredentials.data;
                    const user = await (0, services_1.findUserbyEmail)(email);
                    if (!user || !user.password) {
                        throw new auth_1.UserNotFound();
                    }
                    const validPassword = await bcryptjs_1.default.compare(password, user.password);
                    if (validPassword) {
                        // Mapeia a propriedade para o nome esperado
                        return Object.assign(Object.assign({}, user), { isTwoFactorEnabled: user.isTwoFactorAuthEnabled });
                    }
                }
                return null;
            },
        }),
        (0, google_1.default)({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
        (0, github_1.default)({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
        }),
        (0, facebook_1.default)({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        }),
    ],
};
