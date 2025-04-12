// pages/pulse.jsx
import { useEffect, useState } from "react";
import { useConnection } from "context/connect";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

export default function Pulse() {
  const { connection } = useConnection();
  const [message, setMessage] = useState("");
  const [feed, setFeed] = useState([]);
  const [votes, setVotes] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [comments, setComments] = useState([]);

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000); // difference in seconds
  
    if (diff < 60) return `${diff}m`; // less than 1 min → still show as minutes for simplicity
    if (diff < 3600) return `${Math.floor(diff / 60)}m`; // under 1 hour → show minutes
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`; // under 1 day → show hours
    return `${Math.floor(diff / 86400)}d`; // 1+ day → show days
  };
  

  useEffect(() => {
    if (!connection) return;

    connection.emit("fetchPosts");

    const handlePosts = (data) => setFeed(data);
    const handleNewPost = (post) => {
      setFeed((prev) => [post, ...prev]);
    };
    const handleVoteUpdate = ({ id, votes }) => {
      setFeed((prev) =>
        prev.map((p) => (p.id === id ? { ...p, votes } : p))
      );
    };
    const handleComments = ({ postId, comments }) => {
      if (selectedPost?.id === postId) {
        setComments(comments);
      }
    };
    const handleNewComment = (comment) => {
      if (selectedPost?.id === comment.post_id) {
        setComments((prev) => [...prev, comment]);
      }
    };

    connection.on("posts", handlePosts);
    connection.on("newPost", handleNewPost);
    connection.on("voteUpdate", handleVoteUpdate);
    connection.on("comments", handleComments);
    connection.on("newComment", handleNewComment);

    return () => {
      connection.off("posts", handlePosts);
      connection.off("newPost", handleNewPost);
      connection.off("voteUpdate", handleVoteUpdate);
      connection.off("comments", handleComments);
      connection.off("newComment", handleNewComment);
    };
  }, [connection, selectedPost]);

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
      action = type === "up" ? "down" : "up";
      updatedVote = null;
    } else if (currentVote && currentVote !== type) {
      const reverseAction = currentVote === "up" ? "down" : "up";
      connection.emit("votePost", { id: postId, type: reverseAction });
      action = type;
      updatedVote = type;
    } else {
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

  const openCommentModal = (post) => {
    setSelectedPost(post);
    setCommentModalOpen(true);
    connection.emit("fetchComments", { postId: post.id });
  };

  const handleNewComment = (e, parent_id = null) => {
    e.preventDefault();
    if (!commentMessage.trim()) return;

    const newComment = {
      id: uuidv4(),
      post_id: selectedPost.id,
      parent_id,
      message: commentMessage,
      timestamp: Date.now(),
    };

    connection.emit("newComment", newComment);
    setCommentMessage("");
  };

  const renderComments = (comments, parentId = null, level = 0) => {
    return comments
      .filter((c) => c.parent_id === parentId)
      .map((comment) => (
        <div key={comment.id} className="mb-2" style={{ marginLeft: `${level * 20}px` }}>
          <p className="text-sm text-white">{comment.message}</p>
          
          <form
            onSubmit={(e) => {
              setCommentMessage("");
              handleNewComment(e, comment.id);
            }}
            className="mt-1"
          >
            <input
              type="text"
              placeholder="Reply..."
              className="w-full p-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm mb-2"
              value={parentId === comment.id ? commentMessage : ""}
              onChange={(e) => setCommentMessage(e.target.value)}
            />
          </form>
          {renderComments(comments, comment.id, level + 1)}
        </div>
      ));
  };

  return (
    <div className="h-screen max-w-xl mx-auto flex flex-col text-white p-4 relative">
      <button
        onClick={() => (window.location.href = "/rooms")}
        className="absolute top-4 left-4 bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded-md text-sm"
      >
        ←
      </button>

      <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-cyan-200 to-blue-900 bg-clip-text text-transparent">
          Pulse <span className="text-sm font-normal">(beta)</span>
      </h1>


      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {feed.map((post) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-800 p-4 rounded-lg shadow"
          >
            <p className="mb-2">{post.message}</p>
            <div className="text-sm text-gray-400 flex justify-between items-center">
            <span>{formatTimeAgo(post.timestamp)}</span>
            <div className="flex gap-2">
                <button
                  className="text-blue-400 text-sm"
                  onClick={() => openCommentModal(post)}
                >
                  💬 Comment
                </button>
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

      <div className="mb-20 md:mb-0">
  <form onSubmit={handlePost} className="pt-2 border-t border-zinc-700">
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
</div>


      {commentModalOpen && selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-zinc-900 p-6 rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto relative">
            <h2 className="text-lg font-bold mb-4">{selectedPost.message}</h2>
            <div className="mb-4 space-y-2">
              {renderComments(comments)}
              {comments.length === 0 && (
                <p className="text-gray-400 italic">No comments yet</p>
              )}
            </div>
            <form onSubmit={(e) => handleNewComment(e)} className="mt-2">
              <input
                type="text"
                placeholder="Write a comment..."
                className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 text-white"
                value={commentMessage}
                onChange={(e) => setCommentMessage(e.target.value)}
              />
              <button
                type="submit"
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 p-2 rounded-md"
              >
                Post Comment
              </button>
            </form>
            <button
              onClick={() => setCommentModalOpen(false)}
              className="absolute top-2 right-2 text-white hover:text-red-400"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
