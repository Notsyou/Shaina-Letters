import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await getRole()) redirect("/");
  return <LoginForm />;
}
