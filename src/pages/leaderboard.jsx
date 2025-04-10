import { useEffect, useState } from "react";
import { useConnection } from "context/connect";

export default function Leaderboard() {
  const { connection } = useConnection();
  const [leaderboard, setLeaderboard] = useState({ messages: [], rooms: [] });

  useEffect(() => {
    if (connection) {
      connection.emit("fetchLeaderboard");
      connection.on("leaderboard", data => {
        setLeaderboard(data);
      });
    }
  }, [connection]);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">🏆 Leaderboard</h1>

      <div className="mb-8">
        <h2 className="text-xl mb-2">Top Message Senders</h2>
        <ul className="space-y-1">
          {leaderboard.messages.map((entry, i) => (
            <li key={i}>{i + 1}. {entry.username} – {entry.count} messages</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xl mb-2">Top Room Joiners</h2>
        <ul className="space-y-1">
          {leaderboard.rooms.map((entry, i) => (
            <li key={i}>{i + 1}. {entry.username} – {entry.count} rooms</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
