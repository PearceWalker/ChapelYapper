import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      const isAllowed = user.email.endsWith("@students.fhu.edu") || user.email === "pearcewalker11@gmail.com"    ;

      if (!isAllowed) {
     
        const { google } = account?.provider || {};
        
        throw new Error("UnauthorizedEmail");
      }

      return true;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    error: "/auth/error", 
  },
});
