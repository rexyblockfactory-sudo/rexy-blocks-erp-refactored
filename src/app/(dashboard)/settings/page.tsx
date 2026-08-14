export default function SettingsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">
        System Settings
      </h1>

      <div className="grid gap-6 md:grid-cols-2">

        <div className="rounded-xl border p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Company Information
          </h2>

          <p><strong>Company:</strong> Rexy Blocks Factory</p>
          <p><strong>Location:</strong> Kumasi, Ghana</p>
        </div>

        <div className="rounded-xl border p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            User Management
          </h2>

          <p>Create and manage users.</p>
          <p>Assign permissions.</p>
        </div>

        <div className="rounded-xl border p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Product Pricing
          </h2>

          <ul className="space-y-2">
            <li>5-inch hollow block — GH₵9</li>
            <li>6-inch hollow block — GH₵10</li>
            <li>5-inch solid block — GH₵10</li>
            <li>6-inch solid block — GH₵11</li>
          </ul>
        </div>

        <div className="rounded-xl border p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Inventory Alerts
          </h2>

          <p>Configure minimum stock levels.</p>
        </div>
      </div>
    </div>
  );
}