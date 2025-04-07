import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useConnection } from "context/connect";

export default function Home() {
  const { data: session, status } = useSession();
  const { connection } = useConnection();
  const router = useRouter();
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("Session:", session);
    console.log("Status:", status);
  }, [session, status]);

  useEffect(() => {
    if (session && connection) {
      connection.emit("login", {
        username: session.user.name,
        email: session.user.email,
      });

      connection.on("login", (res) => {
        if (res.success) {
          router.push("/rooms");
        } else {
          setError(res.error);
        }
      });
    }
  }, [session, connection]);

  const handleGoogleLogin = () => {
    signIn("google", {
      prompt: "select_account", 
    });
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-dark-2">
      <h1 className="text-white py-5">This app’s just for FHU students — log in with your @students.fhu.edu email to join.</h1>
      <button
        onClick={handleGoogleLogin}
        className="py-2.5 px-8 rounded text-white bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-80"
      >
        Sign in with Google
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}
