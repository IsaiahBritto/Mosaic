"use server";

import { redirect } from "next/navigation";
import { actionError, actionSuccess, type ActionResult } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";
import {
  signInSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from "@/lib/validation/auth";

export async function signUp(input: SignUpInput): Promise<ActionResult<{ email: string }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
    },
  });

  if (error) {
    return actionError("UNKNOWN", error.message);
  }

  if (!data.user) {
    return actionError("UNKNOWN", "Sign up failed");
  }

  return actionSuccess({ email: parsed.data.email });
}

export async function signIn(input: SignInInput): Promise<ActionResult<null>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return actionError("UNAUTHORIZED", error.message);
  }

  return actionSuccess(null);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
