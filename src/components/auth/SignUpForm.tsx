"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signUp({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        displayName: String(form.get("displayName") ?? ""),
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      setMessage("Account created. You can sign in now.");
      router.push("/login");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <Input
        label="Display name"
        name="displayName"
        type="text"
        autoComplete="name"
        required
        placeholder="Isaiah"
      />
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="At least 8 characters"
      />
      {error ? <p className="text-sm text-status-busy">{error}</p> : null}
      {message ? <p className="text-sm text-status-free">{message}</p> : null}
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
