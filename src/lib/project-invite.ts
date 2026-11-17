// Vercel supplies this deployment's own host. Never derive an invitation
// destination from caller-controlled Host or Origin headers.
export function projectInviteRedirect() {
  const previewHost = process.env.VERCEL_URL;
  if (process.env.VERCEL_ENV === "preview" && previewHost && /^[a-z0-9-]+\.vercel\.app$/.test(previewHost)) {
    return `https://${previewHost}/project-accept-invite`;
  }
  return "https://rexyblockfactory.com/project-accept-invite";
}
