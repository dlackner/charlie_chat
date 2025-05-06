"use client";

export default function PricingPage() {
  const handleCheckout = async () => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-white text-black px-6 py-12">
      <h1 className="text-3xl sm:text-5xl font-light text-center mb-12 tracking-tight">
        Pricing
      </h1>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Charlie Chat */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out">
          <h2 className="text-2xl font-semibold mb-2">Charlie Chat</h2>
          <p className="text-xl font-bold mb-1">$16</p>
          <p className="text-sm text-gray-500 mb-4">(or $20 billed monthly)</p>
          <p className="text-sm text-gray-700 mb-4">
            It’s me, Charles Dobens—my multifamily lessons and stories, my multifamily legal and operational know-how—delivered to you through my Charlie Chat AI assistant.
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4">
            <li>✔️ Unlimited Charlie Chats searches</li>
            <li>✔️ Full Access to my entire knowledge base</li>
            <li>✔️ Deal tactics</li>
            <li>✔️ Closing strategies</li>
          </ul>
          <p className="text-sm italic text-gray-600 mb-3">Try for free! Unlimited searches for 3 days</p>
          <button
            onClick={handleCheckout}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition"
          >
            Get Access
          </button>
        </div>

        {/* Charlie Chat Pro */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out">
          <h2 className="text-2xl font-semibold mb-2">Charlie Chat Pro</h2>
          <p className="text-xl font-bold mb-1">$416</p>
          <p className="text-sm text-gray-500 mb-4">(or $497 billed monthly)</p>
          <p className="text-sm text-gray-700 mb-4">
            My entire Master Class training at your fingertips. Hundreds of hours of additional training on multifamily investing, plus:
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4">
            <li>✔️ Everything in Charlie Chat</li>
            <li>✔️ Access to my Master Class Training Program</li>
            <li>✔️ 10 free national property searches to start you on your way</li>
          </ul>
          <button
            onClick={handleCheckout}
            className="mt-2 w-full bg-blue-700 hover:bg-blue-700 text-white py-2 rounded font-semibold transition"
          >
            Get Access
          </button>
        </div>

        {/* Cohort Program */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out">
          <h2 className="text-2xl font-semibold mb-4">MultifamilyOS Cohort Program</h2>
          <p className="text-sm text-gray-700 mb-4">
            Connect with me and a community of like-minded investors and experienced professionals who provide the guidance and support needed to achieve your goals.
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4">
            <li>✔️ Everything in Charlie Chat Pro</li>
            <li>✔️ Weekly expert sessions led by me</li>
            <li>✔️ A supportive community of peers & investors</li>
            <li>✔️ Step-by-step roadmap for your multifamily investing journey</li>
          </ul>
          <p className="text-sm italic text-gray-600 mb-3">
            Plus unlimited national property searches
          </p>
          <button
            onClick={handleCheckout}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition"
          >
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
}
