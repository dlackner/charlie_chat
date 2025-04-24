export default function PricingPage() {
    return (
      <div className="min-h-screen bg-white text-black px-6 py-12">
        <h1 className="text-4xl font-bold text-center mb-12">
          Pricing
        </h1>
  
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transform transition-transform duration-200 ease-in-out">
            <h2 className="text-2xl font-semibold mb-4">Free</h2>
            <p className="mb-4 text-gray-600">Up to 3 Searches</p>
            <ul className="text-sm space-y-2 text-gray-700">
              <li>✔️ 3 Property Searches</li>
              <li>✔️ 3 Charlie Chat Questions</li>
              <li>✔️ Thread Management</li>
            </ul>
            <button className="mt-6 w-full bg-black text-white py-2 rounded font-semibold hover:brightness-110 transition">
              Sign up
            </button>
          </div>
  
          {/* Pro Plan */}
          <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transform transition-transform duration-200 ease-in-out">
            <h2 className="text-2xl font-semibold mb-4">Pro</h2>
            <p className="mb-4 text-gray-700">$50/mo</p>
            <ul className="text-sm space-y-2 text-gray-800">
              <li>✔️ 250 Property Searches</li>
              <li>✔️ Access to Multiple Property APIs</li>
              <li>✔️ Unlimited Charlie Chat Questions</li>
              <li>✔️ 10 LOI Documents</li>
            </ul>
            <button className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition">
              Sign up
            </button>
          </div>
  
          {/* Premium Plan */}
          <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transform transition-transform duration-200 ease-in-out">
            <h2 className="text-2xl font-semibold mb-4">Unlimited</h2>
            <p className="mb-4 text-gray-600">$500/mo</p>
            <ul className="text-sm space-y-2 text-gray-700">
              <li>✔️ Unlimited Charlie Chat Questions</li>
              <li>✔️ Unlimited Property Searches</li>
              <li>✔️ Saved Chat History</li>
              <li>✔️ Unlimited LOI Agreements</li>
              <li>✔️ Unlimited X Document Generation</li>
              <li>✔️ Charlie’s Personal Number</li>
            </ul>
            <button className="mt-6 w-full bg-black text-white py-2 rounded font-semibold hover:brightness-110 transition">
              Sign up
            </button>
          </div>
        </div>
      </div>
    );
  }
  