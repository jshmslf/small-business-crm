import { headers } from "next/headers";
import { auth } from "./auth";
import { redirect } from "next/navigation";

export async function getSession() {
    return auth.api.getSession({ headers: await headers() });
}

// for change password page
export async function requireSignedIn() {
    const session = await getSession();
    if (!session) redirect("/login");
    return session.user;
}

export async function requireUser() {
    const user = await requireSignedIn();
    if (user.mustChangePassword) redirect("/change-password");
    return user;
}

export async function requireSuperAdmin() {
    const user = await requireUser();
    if (user.role !== "admin") redirect("/dashboard");
    return user;
}