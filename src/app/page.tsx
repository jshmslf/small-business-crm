import { prisma } from "../lib/prisma";

export default async function Home() {
    const count = await prisma.business.count();
    return <p>Business in database: { count } </p>;
}