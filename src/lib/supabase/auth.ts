import { supabase } from "./client";

export async function signIn(
  email: string,
  password: string
) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signUp(
  email: string,
  password: string
) {
  return await supabase.auth.signUp({
    email,
    password,
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  const redirectTo =
    `${window.location.origin}/update-password`;

  return await supabase.auth.resetPasswordForEmail(
    email,
    {
      redirectTo,
    }
  );
}

export async function updatePassword(
  password: string
) {
  return await supabase.auth.updateUser({
    password,
  });
}