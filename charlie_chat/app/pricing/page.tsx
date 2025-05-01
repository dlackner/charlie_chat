export default function PricingPage() {
    return (
      <div className="min-h-screen bg-white text-black px-6 py-12">
        <h1 className="text-4xl font-bold text-center mb-12">
          Pricing
        </h1>
  
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transform transition-transform duration-200 ease-in-out">
            <h2 className="text-2xl font-semibold mb-4">Charlie Chat</h2>
            <p className="mb-4 text-gray-700">$19/mo</p>
            <p className="mb-4 text-gray-600">This isn’t another course. It’s me, Charles Dobens—my lessons, my stories, my legal and operational know-how—delivered to you through an AI assistant that gives you straight answers when you need them.</p>
            <ul className="text-sm space-y-2 text-gray-700">
              <li>✔️ Unlimited Charlie Chats</li>
              <li>✔️ Access to my entire knowledge base</li>
              <li>✔️ Deal tactics</li>
              <li>✔️ Closing strategies</li>
            </ul>
            <button className="mt-6 w-full bg-black text-white py-2 rounded font-semibold hover:brightness-110 transition">
              Sign up
            </button>
          </div>
  
          {/* Pro Plan */}
          <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transform transition-transform duration-200 ease-in-out">
            <h2 className="text-2xl font-semibold mb-4">Charlie Chat Pro</h2>
            <p className="mb-4 text-gray-700">$497/mo</p>
            <p className="mb-4 text-gray-600">Everything in Charlie Chat plus my Master Class training curriculum…the same one that’s helped my students go from zero to thousands of units under management.</p>
            <ul className="text-sm space-y-2 text-gray-800">
              <li>✔️ Everything in Charlie Chat PLUS</li>
              <li>✔️ Access to my Master Class Training Program including….</li>
              <li>✔️ Setting up your company & choosing your market</li>
              <li>✔️ Finding deals & raising money</li>
              <li>✔️ Writing offers & going to contract</li>
              <li>✔️ Due diligence & closing a deal</li>
            </ul>
            <button className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition">
              Sign up
            </button>
          </div>
  
          {/* Premium Plan */}
          <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transform transition-transform duration-200 ease-in-out">
            <h2 className="text-2xl font-semibold mb-4">Multifamily Cohort Program</h2>
            <p className="mb-4 text-gray-600">With the Cohort Program, you’re not tackling multifamily investing alone—you have a team. This program connects you with a community of like-minded investors and experienced professionals who provide the guidance, accountability, and support needed to achieve your goals.</p>
            <ul className="text-sm space-y-2 text-gray-700">
              <li>✔️ Everything in Charlie Chat Pro PLUS</li>
              <li>✔️ Weekly expert sessions led by me</li>
              <li>✔️ A supportive community of peers & investors</li>
              <li>✔️ Step-by-step roadmap for your multifamily investing journey</li>
            </ul>
            <button className="mt-6 w-full bg-black text-white py-2 rounded font-semibold hover:brightness-110 transition">
              Sign up
            </button>
          </div>
        </div>
      </div>
    );
  }
  