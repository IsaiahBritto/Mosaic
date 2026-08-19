import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <>
      <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-wide text-text-secondary">
        Sign in
      </h2>
      <LoginForm />
    </>
  );
}
