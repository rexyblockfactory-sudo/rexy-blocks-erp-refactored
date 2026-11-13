// Supabase admin invitations use the implicit flow, unlike the PKCE browser
// client used for ordinary login and password reset.
export function readProjectInviteFragment(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  return params.get("type") === "invite" && access_token && refresh_token
    ? { access_token, refresh_token }
    : null;
}
