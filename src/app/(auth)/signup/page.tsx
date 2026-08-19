import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <>
      <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-wide text-text-secondary">
        Create account
      </h2>
      <SignUpForm />
    </>
  );
}
