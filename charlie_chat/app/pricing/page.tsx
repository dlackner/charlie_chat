"use client";

export default function PricingPage() {
  const handleCheckout = async () => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // single product for now
    });

    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-white text-black px-6 py-12">
      <h1 className="text-3xl sm:text-5xl font-light text-center mb-12 tracking-tight">
        Pricing
      </h1>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free Plan */}
        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out">
          <h2 className="text-2xl font-semibold mb-4">Charlie Chat</h2>
          <p className="mb-4 text-gray-700">$19/mo</p>
          <p className="mb-4 text-gray-600">
            This isn’t another course. It’s Charles Dobens—his lessons, stories, and legal know-how—delivered by AI.
          </p>
          <ul className="text-sm space-y-2 text-gray-700">
            <li>✔️ Unlimited Charlie Chats</li>
            <li>✔️ Access to full knowledge base</li>
            <li>✔️ Deal tactics & closing strategies</li>
          </ul>
          <button
            onClick={handleCheckout}
            className="mt-6 w-full bg-black text-white py-2 rounded font-semibold hover:brightness-110 transition"
          >
            Sign up
          </button>
        </div>

        {/* Pro Plan */}
        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out">
          <h2 className="text-2xl font-semibold mb-4">Charlie Chat Pro</h2>
          <p className="mb-4 text-gray-700">$497/mo</p>
          <p className="mb-4 text-gray-600">
            Everything in Chat plus Charles’ full Master Class curriculum—used by students with thousands of units.
          </p>
          <ul className="text-sm space-y-2 text-gray-800">
            <li>✔️ Everything in Charlie Chat</li>
            <li>✔️ Full Master Class training</li>
            <li>✔️ Raising money, writing offers, closing deals</li>
          </ul>
          <button
            onClick={handleCheckout}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition"
          >
            Sign up
          </button>
        </div>

        {/* Premium Plan */}
        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out">
          <h2 className="text-2xl font-semibold mb-4">Multifamily Cohort Program</h2>
          <p className="mb-4 text-gray-600">
            You’re not alone—this plan connects you with peers, pros, and a guided roadmap to success.
          </p>
          <ul className="text-sm space-y-2 text-gray-700">
            <li>✔️ Everything in Pro</li>
            <li>✔️ Weekly live expert sessions</li>
            <li>✔️ Peer accountability & community</li>
            <li>✔️ Clear roadmap to first deal</li>
          </ul>
          <button
            onClick={handleCheckout}
            className="mt-6 w-full bg-black text-white py-2 rounded font-semibold hover:brightness-110 transition"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
