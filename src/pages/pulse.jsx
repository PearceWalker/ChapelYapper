// pages/pulse.jsx
import { useEffect, useState } from "react";
import { useConnection } from "context/connect";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

export default function Pulse() {
  const { connection } = useConnection();
  const [message, setMessage] = useState("");
  const [feed, setFeed] = useState([]);
  const [votes, setVotes] = useState({}); // { postId: 'up' | 'down' | null }


  useEffect(() => {
    if (connection) {
      connection.emit("fetchPosts");
      connection.on("posts", (data) => {
        setFeed(data);
      });

      connection.on("newPost", (post) => {
        setFeed((prev) => [post, ...prev]);
      });

      connection.on("voteUpdate", ({ id, votes }) => {
        setFeed((prev) =>
          prev.map((p) => (p.id === id ? { ...p, votes } : p))
        );
      });
    }
  }, [connection]);

  const handlePost = (e) => {
    e.preventDefault();
    if (message.trim() === "") return;
    const newPost = {
      id: uuidv4(),
      message,
      timestamp: Date.now(),
      votes: 0,
    };
    connection.emit("newPost", newPost);
    setMessage("");
  };

  const handleVote = (postId, type) => {
    const currentVote = votes[postId];
  
    let action = null;
    let updatedVote = null;
  
    if (currentVote === type) {
      // Undo vote (remove it)
      action = type === "up" ? "down" : "up"; // subtract vote
      updatedVote = null;
    } else if (currentVote && currentVote !== type) {
      // Switch vote: subtract old, add new
      const reverseAction = currentVote === "up" ? "down" : "up";
      connection.emit("votePost", { id: postId, type: reverseAction }); // subtract previous
      action = type; // add new
      updatedVote = type;
    } else {
      // First time voting
      action = type;
      updatedVote = type;
    }
  
    if (action) {
      connection.emit("votePost", { id: postId, type: action });
    }
  
    setVotes((prev) => ({
      ...prev,
      [postId]: updatedVote,
    }));
  };
  
  

  return (
    <div className="p-6 max-w-xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">Pulse</h1>

      <form onSubmit={handlePost} className="mb-4">
        <input
          type="text"
          className="w-full p-3 rounded-md bg-zinc-800 border border-zinc-600 text-white"
          placeholder="What's happening?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="submit"
          className="mt-2 w-full bg-blue-600 hover:bg-blue-700 p-2 rounded-md"
        >
          Post
        </button>
      </form>

      <div className="space-y-4">
        {feed.map((post) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-800 p-4 rounded-lg shadow"
          >
            <p className="mb-2">{post.message}</p>
            <div className="text-sm text-gray-400 flex justify-between items-center">
              <span>{new Date(post.timestamp).toLocaleTimeString()}</span>
              <div className="flex gap-2">
              <button
                onClick={() => handleVote(post.id, "up")}
                className={votes[post.id] === "up" ? "text-green-500" : ""}
                >
                👍 {post.votes}
                </button>

                <button
                onClick={() => handleVote(post.id, "down")}
                className={votes[post.id] === "down" ? "text-red-500" : ""}
                >
                👎
                </button>

              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
