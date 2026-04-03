import { LoginClient } from "./login-client";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const nextPath =
    typeof next === "string" && next.startsWith("/") ? next : null;
  return <LoginClient nextPath={nextPath} />;
}
