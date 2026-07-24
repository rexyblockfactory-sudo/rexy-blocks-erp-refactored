import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.https://qgyenqihqlcvikcyglxb.supabase.co!;
const supabaseAnonKey = process.env.sb_publishable_EHONQx1PoL4xTpDlNKtcVA_45jf05qP!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);