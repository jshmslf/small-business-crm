"use server";

import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { requireSignedIn } from "@/src/lib/session";
import { headers } from "next/headers";

type Result = { ok: true } | { ok: false; error: string }

export async function changePassword(input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}): Promise<Result> {
    const user = await requireSignedIn();

    if (input.newPassword.length < 8) {
        return { ok: false, error: "New password must be at least 8 characters." };
    }
    if (input.newPassword !== input.confirmPassword) {
        return { ok: false, error: "New passwords don't match." };
    }
    if (input.newPassword == input.currentPassword) {
        return { ok: false, error: "New password must be different from temporary one."}
    }

    try {
        await auth.api.changePassword({
            body: {
                currentPassword: input.currentPassword,
                newPassword: input.newPassword,
                revokeOtherSessions: true,
            },
            headers: await headers(),
        });
    } catch {
        return { ok: false, error: "Current password is incorrect." }
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { mustChangePassword: false },
    });

    return { ok: true }
}