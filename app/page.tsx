export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-lg border p-8 shadow-lg">
        <h1 className="text-3xl font-bold">Rexy Blocks ERP</h1>

        <div className="mt-6 space-y-2">
          <p>
            Supabase URL:
            <strong>
              {process.env.NEXT_PUBLIC_SUPABASE_URL
                ? " ✅ Loaded"
                : " ❌ Missing"}
            </strong>
          </p>

          <p>
            Supabase Key:
            <strong>
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                ? " ✅ Loaded"
                : " ❌ Missing"}
            </strong>
          </p>
        </div>
      </div>
    </main>
  );
}