import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useConnection } from "context/connect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faArrowDown, faComment, faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export default function Profile() {
  const { data: session } = useSession();
  const user = session?.user;
  const { connection } = useConnection();

  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [view, setView] = useState("posts");
  const [activeComments, setActiveComments] = useState({});

  useEffect(() => {
    if (!connection || !user) return;

    connection.emit("fetchPosts");
     connection.emit("fetchUserComments");
    connection.on("posts", (data) => {
      setPosts(data.filter((p) => p.email === user.email));
    });

    connection.on("userComments", (data) => {
    setComments(data);
  });

    return () => {
      connection.off("posts");
      connection.off("userComments");
    };
  }, [connection, user]);

  const fetchComments = (postId) => {
    if (!connection) return;
    connection.emit("fetchComments", { postId });
    connection.on("comments", ({ postId: id, comments }) => {
      setActiveComments((prev) => ({ ...prev, [id]: comments }));
    });
  };

  const deletePost = (postId) => {
    connection.emit("deletePost", { postId });
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const deleteComment = (id) => {
    connection.emit("deleteComment", { id });
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleComments = (postId) => {
    if (activeComments[postId]) {
      setActiveComments((prev) => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });
    } else {
      fetchComments(postId);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">
    <button onClick={() => (window.location.href = "/pulse")}><FontAwesomeIcon icon={faArrowLeft} className="h-5 w-5" /></button>
      <h1 className="text-3xl font-bold mb-4">Your Profile</h1>

      <div className="flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded-md ${view === "posts" ? "bg-blue-600" : "bg-zinc-700"}`}
          onClick={() => setView("posts")}
        >
          Your Posts
        </button>
        <button
          className={`px-4 py-2 rounded-md ${view === "comments" ? "bg-blue-600" : "bg-zinc-700"}`}
          onClick={() => setView("comments")}
        >
          Your Comments
        </button>
      </div>

      {view === "posts" && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <p className="text-gray-400">You haven't posted anything yet.</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-zinc-800 p-4 rounded-md space-y-2">
                <p className="text-white">{post.message}</p>
                {post.image_url && (
                  <img src={post.image_url} alt="post" className="rounded w-full max-h-60 object-contain" />
                )}
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faArrowUp} />
                    <span>{post.votes}</span>
                    <FontAwesomeIcon icon={faArrowDown} />
                  </div>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1 hover:text-blue-400"
                  >
                    <FontAwesomeIcon icon={faComment} /> Comments
                  </button>
                </div>
                <p className="text-gray-500 text-xs">Posted at {new Date(post.timestamp).toLocaleString()}</p>
                <button onClick={() => deletePost(post.id)} className="mt-1 text-red-400 hover:text-red-300 text-sm">Delete</button>

                {activeComments[post.id] && (
                  <div className="mt-3 space-y-2 border-t border-zinc-600 pt-2">
                    {activeComments[post.id].length === 0 ? (
                      <p className="text-gray-400">No comments yet.</p>
                    ) : (
                      activeComments[post.id].map((comment) => (
                        <div key={comment.id} className="bg-zinc-700 p-2 rounded">
                          <p className="text-sm">{comment.message}</p>
                          <p className="text-xs text-gray-400">{new Date(comment.timestamp).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {view === "comments" && (
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-400">You haven't commented yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-zinc-800 p-4 rounded-md">
                <p className="text-white mb-1">{comment.message}</p>
                <p className="text-gray-400 text-sm">Commented at {new Date(comment.timestamp).toLocaleString()}</p>
                <button onClick={() => deleteComment(comment.id)} className="mt-2 text-red-400 hover:text-red-300 text-sm">Delete</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
