import { headers } from "next/headers";
import { auth } from "./auth";
import { redirect } from "next/navigation";

export async function getSession() {
    return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
    const session = await getSession();
    if (!session) redirect("/login");
    return session.user;
}

export async function requireSuperAdmin() {
    const user = await requireUser();
    if (user.role !== "admin") redirect("/dashboard");
    return user;
}