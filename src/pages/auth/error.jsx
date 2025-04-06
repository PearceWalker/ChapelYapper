import { signOut } from "next-auth/react";

export default function AuthError() {
  const clearGoogleSession = () => {
    // Sign out of your app first
    signOut({ redirect: false }).then(() => {
      // Then force Google logout
      window.location.href = "https://accounts.google.com/Logout";
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white">
      <h1 className="text-2xl mb-4">Unauthorized Email</h1>
      <p className="mb-6 text-gray-300">Only @students.fhu.edu emails are allowed.</p>
      <button
        onClick={clearGoogleSession}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded"
      >
        Switch Google Account
      </button>
    </div>
  );
}

