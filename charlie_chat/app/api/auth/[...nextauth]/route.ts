// /app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 👉 Replace this with your own user lookup logic
        const hardcodedUser = {
          id: "1",
          email: "test@example.com",
          password: "123",
        };

        if (
          credentials?.email === hardcodedUser.email &&
          credentials?.password === hardcodedUser.password
        ) {
          return { id: hardcodedUser.id, email: hardcodedUser.email };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
