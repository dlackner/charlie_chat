"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="w-full px-6 py-4 flex justify-between items-center bg-white border-b border-gray-200 shadow-sm">
      {/* Logo */}
      <div className="flex items-center">
        <Image src="/logo.png" alt="Logo" width={192} height={192} className="mr-2" />
      </div>

      {/* Right nav */}
      <div className="flex items-center space-x-6 text-sm">
        <Link href="/" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Home</Link>
        <Link href="/pricing" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Pricing</Link>

        {session ? (
          <button
            onClick={() => signOut()}
            className="bg-gray-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Sign out
          </button>
        ) : (
          <Link href="/login">
            <button className="bg-black text-white text-sm px-4 py-2 rounded-lg hover:brightness-110 transition">
              Sign in
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}
