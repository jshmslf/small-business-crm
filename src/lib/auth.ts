import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
        enabled: true,
        disableSignUp: true // no one can register
    },
    user: {
        additionalFields: {
            mustChangePassword: {
                type: "boolean",
                defaultValue: false,
                input: false,
            }
        }
    },
    plugins: [admin(), nextCookies()]
})