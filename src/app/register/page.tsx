import { listNationsOrdered } from "@/lib/nations";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const nations = await listNationsOrdered();
  return <RegisterForm nations={nations} />;
}
