export function paystackSecret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (process.env.PAYSTACK_ENABLE_CHECKOUT !== "true") return null;
  if (key?.startsWith("sk_live_")) return key;
  // Test transactions are permitted only outside Vercel, against an isolated test database.
  if (!process.env.VERCEL_ENV && key?.startsWith("sk_test_")) return key;
  return null;
}

export async function paystackRequest(path: string, key: string, body?: Record<string, unknown>) {
  const response = await fetch("https://api.paystack.co/transaction/" + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || result.status !== true) throw new Error("Paystack request failed.");
  return result.data;
}
