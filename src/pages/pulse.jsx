import { useEffect, useState, useRef } from "react";
import { useConnection } from "context/connect";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleArrowUp,
  faCircleArrowDown,
  faComment,
  faImage,
  faFlag,
  faExchange,
  faUser
} from "@fortawesome/free-solid-svg-icons";

export default function Pulse() {
  const { connection } = useConnection();
  const { data: session } = useSession();
  const user = session?.user;

  const [message, setMessage] = useState("");
  const [feed, setFeed] = useState([]);
  const [votes, setVotes] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [comments, setComments] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [repostTarget, setRepostTarget] = useState(null);
  const [repostModalOpen, setRepostModalOpen] = useState(false);
  const [replyToCommentId, setReplyToCommentId] = useState(null);

  const feedRef = useRef(null);

  const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  useEffect(() => {
    if (!connection) return;
    connection.emit("fetchPosts");
    connection.on("posts", setFeed);
    connection.on("newPost", (post) => {
      setFeed((p) => [post, ...p]);
      if (feedRef.current) feedRef.current.scrollTo({ top: 0, behavior: "smooth" });
    });
    connection.on("voteUpdate", ({ id, votes }) => {
      setFeed((p) => p.map((x) => (x.id === id ? { ...x, votes } : x)));
    });
    connection.on("comments", ({ postId, comments: fetched }) => {
      if (selectedPost?.id === postId) setComments(fetched);
    });
    connection.on("newComment", (comment) => {
      if (selectedPost?.id === comment.post_id) {
        setComments((prev) => [...prev, comment]);
      }
    });
    return () => {
      connection.off("posts");
      connection.off("newPost");
      connection.off("voteUpdate");
      connection.off("comments");
      connection.off("newComment");
    };
  }, [connection, selectedPost]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    let fileData = null;
    if (imageFile) {
      const base64 = await toBase64(imageFile);
      fileData = { file: base64, type: imageFile.type };
    }
    connection.emit("newPost", {
      id: uuidv4(),
      message,
      timestamp: Date.now(),
      votes: 0,
      email: user?.email,
      replied_to: repostTarget?.id || null,
      ...fileData,
    });
    setMessage("");
    setImageFile(null);
    setRepostTarget(null);
  };

  const handleVote = (postId, type) => {
    const current = votes[postId];
    let action, updated;
    if (current === type) {
      action = type === "up" ? "down" : "up";
      updated = null;
    } else if (current && current !== type) {
      const reverse = current === "up" ? "down" : "up";
      connection.emit("votePost", { id: postId, type: reverse });
      action = type;
      updated = type;
    } else {
      action = type;
      updated = type;
    }
    connection.emit("votePost", { id: postId, type: action });
    setVotes((prev) => ({ ...prev, [postId]: updated }));
  };

  const handleReport = (post) => {
    const reason = prompt("Why are you reporting this post?");
    if (!reason || !user?.email) return;
    connection.emit("reportPost", {
      id: uuidv4(),
      post_id: post.id,
      reporter_email: user.email,
      reason,
      timestamp: Date.now(),
    });
    alert("Post reported.");
  };

  const openCommentModal = (post) => {
    setSelectedPost(post);
    setCommentModalOpen(true);
    connection.emit("fetchComments", { postId: post.id });
  };

  const submitComment = (e, parent_id = null) => {
    e.preventDefault();
    if (!commentMessage.trim()) return;
    connection.emit("newComment", {
      id: uuidv4(),
      post_id: selectedPost.id,
      parent_id,
      message: commentMessage,
      timestamp: Date.now(),
      email: user?.email,
    });
    setCommentMessage("");
  };

  const renderComments = () => {
    const childrenMap = {};
    comments.forEach(c => { childrenMap[c.id] = []; });
    comments.forEach(c => {
      if (c.parent_id && childrenMap[c.parent_id]) {
        childrenMap[c.parent_id].push(c);
      }
    });
    const topLevel = comments.filter(c => !c.parent_id).sort((a, b) => a.timestamp - b.timestamp);
    const renderTree = (comment, depth = 0) => {
      const isOP = comment.email === selectedPost.email;
      const selfLabel = isOP ? "OP" : comment.commenter_index != null ? `#${comment.commenter_index}` : "";
      let parentLabel = "";
      if (comment.parent_id) {
        const parent = comments.find(c => c.id === comment.parent_id);
        if (parent) {
          parentLabel = parent.email === selectedPost.email ? "OP" : parent.commenter_index != null ? `#${parent.commenter_index}` : "";
        }
      }
      const indentClass = depth > 0 ? "pl-5" : "";
      return (
        <div key={comment.id} className={`py-4 ${indentClass} border-b border-zinc-700`}>
          <div className="text-sm text-white flex items-center">
            <span className="text-xs text-gray-400 font-bold mr-2">
              {comment.parent_id ? `(${selfLabel} → ${parentLabel})` : selfLabel}
            </span>
            <span className="flex-1">{comment.message}</span>
            <button onClick={() => setReplyToCommentId(comment.id)} className="text-xs text-gray-400 hover:text-gray-200 ml-4">Reply</button>
          </div>
          {replyToCommentId === comment.id && (
            <form onSubmit={(e) => { submitComment(e, comment.id); setReplyToCommentId(null); }} className="mt-3">
              <input type="text" placeholder="Write a reply..." className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm" value={commentMessage} onChange={(e) => setCommentMessage(e.target.value)} />
            </form>
          )}
          {childrenMap[comment.id].sort((a, b) => a.timestamp - b.timestamp).map(child => renderTree(child, depth + 1))}
        </div>
      );
    };
    return topLevel.map(c => renderTree(c, 0));
  };

  return (
    <div className="h-[100dvh] md:h-screen max-w-xl mx-auto flex flex-col text-white p-4 relative">
      <button onClick={() => (window.location.href = "/rooms")} className="absolute top-4 left-4 bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded-md text-sm">←</button>
      <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-cyan-200 to-blue-900 bg-clip-text text-transparent">Pulse <span className="text-sm font-normal">(beta)</span></h1>
      <button onClick={() => (window.location.href = "/profile")} className="absolute top-4 right-4 bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded-md text-sm"><FontAwesomeIcon icon={faUser} className="h-5 w-5" /></button>

      <div ref={feedRef} className="flex-1 overflow-y-auto space-y-4 pr-1 pb-40">
        {feed.map((post) => (
          <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-800 p-4 rounded-lg shadow">
            {post.replied_to && (
              <div onClick={() => openCommentModal(feed.find(p => p.id === post.replied_to))} className="p-3 rounded border border-zinc-700 bg-zinc-800 text-sm mb-2 cursor-pointer hover:bg-zinc-700">
                <span className="text-blue-400 font-semibold">Repost</span>
                <p className="text-white mt-1">{feed.find(p => p.id === post.replied_to)?.message || "Original post not available."}</p>
              </div>
            )}
            <p className="mb-3 mt-3">{post.message}</p>
            {(post.file || post.image_url) && <img src={post.file || post.image_url} alt="Attached" className="mt-2 w-full rounded-md max-h-64 object-contain border border-zinc-700" />}
            <div className="text-sm text-gray-400 flex justify-between items-center">
              <span>{formatTimeAgo(post.timestamp)}</span>
              <div className="flex gap-2 mt-4">
                <button onClick={() => openCommentModal(post)}><FontAwesomeIcon icon={faComment} className="h-5 w-5" /></button>
                <button onClick={() => { setRepostTarget(post); setRepostModalOpen(true); }}><FontAwesomeIcon icon={faExchange} className="h-5 w-5" /></button>
                <button onClick={() => handleReport(post)}><FontAwesomeIcon icon={faFlag} className="h-5 w-5" /></button>
                <button onClick={() => handleVote(post.id, "up")}><FontAwesomeIcon icon={faCircleArrowUp} className="h-5 w-5" /></button>
                {post.votes}
                <button onClick={() => handleVote(post.id, "down")}><FontAwesomeIcon icon={faCircleArrowDown} className="h-5 w-5" /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-zinc-900 pt-4 pb-6 px-2 border-t border-zinc-700">
        {imageFile && <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-auto rounded-lg max-h-64 object-contain border border-zinc-700 mb-2" />}
        <form onSubmit={handlePost} className="flex flex-col gap-2">
          <input type="text" className="w-full p-3 rounded-md bg-zinc-800 border border-zinc-600 text-white" placeholder="What's happening?" value={message} onChange={(e) => setMessage(e.target.value)} />
          <label className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-md cursor-pointer w-fit text-sm">
            <FontAwesomeIcon icon={faImage} className="h-5 w-5" />
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              if (file.size > MAX_IMAGE_SIZE) {
                alert("Image is too large! Max size is 2MB.");
                e.target.value = null;
                return;
              }
              setImageFile(file);
            }} className="hidden" />
          </label>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded-md">Post</button>
        </form>
      </div>

      {repostModalOpen && repostTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-zinc-900 p-6 rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto relative">
            <h2 className="text-lg font-bold mb-4">Reposting:</h2>
            <div className="p-3 rounded border border-zinc-700 bg-zinc-800 text-sm mb-4">
              <p className="text-gray-300">{repostTarget.message}</p>
              {repostTarget.file && <img src={repostTarget.file} alt="Repost" className="mt-2 w-full rounded max-h-64 object-contain border border-zinc-700" />}
            </div>
            <form onSubmit={(e) => { handlePost(e); setRepostModalOpen(false); }} className="space-y-3">
              <input type="text" placeholder="Add a comment to your repost..." className="w-full p-3 rounded-md bg-zinc-800 border border-zinc-600 text-white" value={message} onChange={(e) => setMessage(e.target.value)} />
              <label className="m-2">
                <FontAwesomeIcon icon={faImage} className="h-5 w-5" />
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > MAX_IMAGE_SIZE) {
                    alert("Image is too large! Max size is 2MB.");
                    e.target.value = null;
                    return;
                  }
                  setImageFile(file);
                }} className="hidden" />
              </label>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded-md">Post Repost</button>
            </form>
            <button onClick={() => setRepostModalOpen(false)} className="absolute top-2 right-2 text-white hover:text-red-400">✕</button>
          </div>
        </div>
      )}

      {commentModalOpen && selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-zinc-900 p-6 rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto relative">
            <h2 className="text-lg font-bold mb-4">{selectedPost.message}</h2>
            <div className="mb-4 space-y-2">{comments.length > 0 ? renderComments() : <p className="text-gray-400 italic">No comments yet</p>}</div>
            <form onSubmit={submitComment} className="mt-2">
              <input type="text" placeholder="Write a comment..." className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 text-white" value={commentMessage} onChange={(e) => setCommentMessage(e.target.value)} />
              <button type="submit" className="mt-2 w-full bg-blue-600 hover:bg-blue-700 p-2 rounded-md">Post Comment</button>
            </form>
            <button onClick={() => setCommentModalOpen(false)} className="absolute top-2 right-2 text-white hover:text-red-400">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
