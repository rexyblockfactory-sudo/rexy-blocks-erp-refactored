export const metadata = { title: "Payment confirmation", robots: { index: false, follow: false } };

export default function PaymentReturnPage() {
  return (
    <main className="min-h-screen bg-[#eef3ef] px-4 py-12 text-[#192d26]">
      <div className="mx-auto max-w-lg space-y-4 rounded-xl bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-semibold">Check your payment status</h1>
        <p>Return to your original quote tab and refresh it. The status updates after Paystack confirms your deposit.</p>
        <p>If the deposit does not appear, contact the factory before paying again.</p>
      </div>
    </main>
  );
}
