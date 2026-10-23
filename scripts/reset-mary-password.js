require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY;

const USER_ID = "d840758c-bb02-416f-9f1b-1f2f85f0fd64";
const EMAIL = "maryeverywhere@icloud.com";
const NEW_PASSWORD = process.env.MARY_NEW_PASSWORD;


if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL");
}

if (!SUPABASE_SECRET_KEY) {
  throw new Error("Missing SUPABASE_SECRET_KEY");
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing SUPABASE_PUBLISHABLE_KEY");
}

if (!NEW_PASSWORD) {
  throw new Error("Missing MARY_NEW_PASSWORD");
}

async function main() {
  console.log("========================================");
  console.log("REXY - MARY ACCOUNT UPDATE");
  console.log("========================================");
  console.log("");

  const admin = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

  console.log("1. Checking Mary's Auth account...");

  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(USER_ID);

  if (userError) {
    throw new Error(
      `Could not find Auth user: ${userError.message}`
    );
  }

  console.log("   User found");
  console.log("   Current email:", userData.user.email);
  console.log("");

  console.log("2. Updating email and password...");

  const { data: updatedData, error: updateError } =
    await admin.auth.admin.updateUserById(USER_ID, {
      email: EMAIL,
      password: NEW_PASSWORD,
      email_confirm: true,
    });

  if (updateError) {
    throw new Error(
      `Auth update failed: ${updateError.message}`
    );
  }

  console.log("   Auth update successful");
  console.log("   New email:", updatedData.user.email);
  console.log("   Password updated: YES");
  console.log("");

  console.log("3. Synchronizing profile...");

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: "Mary Addai",
      email: EMAIL,
    })
    .eq("id", USER_ID);

  if (profileError) {
    throw new Error(
      `Profile update failed: ${profileError.message}`
    );
  }

  console.log("   Profile updated");
  console.log("");

  console.log("4. Testing the new login...");

  const authClient = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

  const { data: loginData, error: loginError } =
    await authClient.auth.signInWithPassword({
      email: EMAIL,
      password: NEW_PASSWORD,
    });

  if (loginError) {
    console.error("");
    console.error("LOGIN TEST FAILED");
    console.error("Supabase message:", loginError.message);
    console.error("");
    process.exit(1);
  }

  console.log("   LOGIN TEST PASSED");
  console.log("   User ID:", loginData.user.id);
  console.log("");

  console.log("========================================");
  console.log("SUCCESS");
  console.log("Mary can now log in.");
  console.log("========================================");
}

main().catch((error) => {
  console.error("");
  console.error("ERROR:");
  console.error(error.message);
  console.error("");
  process.exit(1);
});