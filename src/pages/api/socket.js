import { mainConfig } from "config/config";
import { Server } from "socket.io";
import { initDb } from '../../libraries/statsDb'; 
import { uploadImage } from './upload'; // adjust path as needed


export default async function handler(req, res) {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  // ✅ Wait for DB to initialize properly
  const db = await initDb();

  const io = new Server(res.socket.server, {
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  res.socket.server.io = io;


  io.use((socket, next) => {
    setInterval(() => {
      socket.emit("ping", "pong");
    }, 1000);
    next();
  });

  io.on("connection", (socket) => {
    socket.join('global');

    socket.on("login", async (data) => {
      const { username } = data;

      const allSockets = await io.fetchSockets();
      const userSockets = allSockets.filter((s) => s?.data?.user?.username === username);
  

      if (userSockets.length > 0) return socket.emit("login", { error: "Username already taken"});


      var user = {
        username,
      };

      if(username.includes(mainConfig.verifiedNames)){
         user = {
          username,
          verified: true,
        };
      }else{
        user = {
          username
        };
      }



      socket.data.user = user;
      socket.emit("login", {
        success: true,
        data: user
      });
    });

    socket.on("fetchUser", () => {
      const user = socket.data.user;
      if (user) {
        socket.emit("user", user);
      } else {
        socket.emit("user", null);
      }
    })

        // --- PULSE FEATURE ---

        socket.on("fetchPosts", async () => {
          try {
            const posts = await db.all(`
              SELECT
                id,
                message,
                timestamp,
                votes,
                image_url,
                replied_to,
                email
              FROM pulse_posts
              ORDER BY timestamp DESC
              LIMIT 50
            `);
            socket.emit("posts", posts);
          } catch (err) {
            console.error("Error fetching Pulse posts:", err);
            socket.emit("posts", []);
          }
        });
        
        socket.on("newPost", async (post) => {
          try {
            let imageUrl = null;
        
            if (
              post.file &&
              (post.type === "image/png" ||
               post.type === "image/jpeg" ||
               post.type === "image/jpg")
            ) {
              imageUrl = await uploadImage(post.file);
            }
        
            await db.run(
              `INSERT INTO pulse_posts
                 (id, message, timestamp, votes, image_url, replied_to, email)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [post.id,
              post.message,
              post.timestamp,
              post.votes,
              imageUrl,
              post.replied_to || null,
              post.email]
            );

            
            await db.run(`
            INSERT INTO post_counter (email, count)
            VALUES ($1, 1)
            ON CONFLICT(email) DO UPDATE SET count = post_counter.count + 1
            `, [post.email]);
          
        
            io.emit("newPost", {
              ...post,
              image_url: imageUrl,
              email: post.email,
            });
          } catch (err) {
            console.error("Error inserting Pulse post:", err);
          }

          
        });
        
        
        
        socket.on("votePost", async ({ id, type }) => {
  try {
    const row = await db.get("SELECT votes FROM pulse_posts WHERE id = ?", [id]);

    if (!row) return;

    let newVotes = row.votes;

    if (type === "up") newVotes += 1;
    else if (type === "down") newVotes -= 1;

    await db.run("UPDATE pulse_posts SET votes = ? WHERE id = ?", [newVotes, id]);

    // Emit updated vote to everyone
    io.emit("voteUpdate", { id, votes: newVotes });

  } catch (err) {
    console.error("Error updating vote:", err);
  }
});


        socket.on("reportPost", async (report) => {
          try {
            await db.run(
              "INSERT INTO pulse_reports (id, post_id, reporter_email, reason, timestamp) VALUES ($1, $2, $3, $4, $5)",
              [report.id,
              report.post_id,
              report.reporter_email,
              report.reason,
              report.timestamp]
            );
          } catch (err) {
            console.error("Error reporting post:", err);
          }
        });
        
    

    socket.on("fetchLeaderboard", async () => {
      try {
        const messages = await db.all("SELECT * FROM message_counts ORDER BY count DESC LIMIT 10");
        const rooms = await db.all("SELECT * FROM room_joins ORDER BY count DESC LIMIT 10");
        const posts = await db.all("SELECT * FROM post_counter ORDER BY count DESC LIMIT 10");
        console.log("Emitting leaderboard: messages:", messages, "rooms:", rooms);
        socket.emit("leaderboard", { messages, rooms, posts });
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        socket.emit("leaderboard", { messages: [], rooms: [] , posts: []});
      }
    });
    

    socket.on("fetchRooms", () => {
      setInterval(async () => {
        const rooms = io.sockets.adapter.rooms;
        const allRooms = (await Promise.all(Object.keys(rooms).map(async (room) => {
          const sockets = await io.in(room).fetchSockets();
          const users = sockets.map((s) => s.data.user);
          return {
            id: room,
            name: rooms[room]?.name,
            owner: rooms[room]?.owner,
            passwordProtected: rooms[room]?.password ? true : false,
            maxUsers: rooms[room]?.maxUsers,
            users: users.length
          };
        }))).filter((r) => r.name !== 'global');
        socket.emit("rooms", {
          isLogged: socket.data?.user !== undefined ? true : false,
          user: socket.data?.user,
          rooms: allRooms
        });

        const allSockets = await io.fetchSockets();
        const users = allSockets.filter((s) => s?.data?.user?.username);
        const usersonline = users.length;
        
        socket.emit("UsersOnline", { success: true, users: usersonline });
      }, 1000);
    });

    socket.on("fetchReports", async () => {
      const reports = await db.all(`
        SELECT r.id, r.post_id, r.reason, r.timestamp, r.reporter_email, p.message, p.image_url
        FROM pulse_reports r
        JOIN pulse_posts p ON r.post_id = p.id
      `);
      socket.emit("reports", reports);
    });
    
    socket.on("declineReport", async ({ reportId }) => {
      await db.run("DELETE FROM pulse_reports WHERE id = $1", [reportId]);
    });
    
    socket.on("removePost", async ({ reportId, postId }) => {
      await db.run("DELETE FROM pulse_reports WHERE id = $1", [reportId]);

      await db.run("DELETE FROM pulse_posts WHERE id = $1", [postId]);

    });

     socket.on("deletePost", async ({ postId }) => {
  console.log("DELETING POST:", postId);

  try {
    const result = await db.run("DELETE FROM pulse_posts WHERE id = $1", [postId]);
    console.log("Delete result:", result);
  } catch (err) {
    console.error("Failed to delete post:", err);
  }
});

  

    socket.on("deleteComment", async ({ id }) => {
  
    await db.run("DELETE FROM pulse_comments WHERE id = $1", [id]);
   
});

    

    

    socket.on("UsersOnline", async () => {
      socket.emit("UsersOnline", { success: true });
    });

    socket.on("createRoom", data => {
  const { name, anonymousToggle, password, maxUsers } = data;

  if (!name) return socket.emit("createRoom", { success: false, error: "Name is required" });
  if (io.sockets.adapter.rooms[name]) return socket.emit("createRoom", { success: false, error: "Room already exists" });

  let room = {
    id: Math.random().toString(36).substring(2, 9),
    name: name.replace(/[^a-zA-Z0-9 ]/g, ""),
    owner: socket.data.user,
    users: 1,
    anonymous: anonymousToggle, 
    maxUsers: maxUsers,
  };

  if (password) room.password = password;

  io.sockets.adapter.rooms[room.id] = room;

      socket.rooms.forEach((user_room) => {
        socket.leave(user_room);
        updateMembers(user_room);
        socket.to(user_room).emit("message", {
          system: true,
          message: `${socket.data.user.username} left the room`
        });
      });
      socket.join(room.id);
      socket.emit("createRoom", { success: true, data: room });
    })

    socket.on("joinRoom", async data => {
      const { id, password } = data;
      if (!id) return socket.emit("joinRoom", { success: false, error: "Room id is required" });
      if (!io.sockets.adapter.rooms[id]) return socket.emit("joinRoom", { success: false, error: "Room not found" });

      const room = io.sockets.adapter.rooms[id];
      if (room.password && room.password !== password) return socket.emit("joinRoom", { success: false, error: "Wrong password" });
      const sockets = await io.in(id).fetchSockets();
      if (sockets.length >= room.maxUsers) return socket.emit("joinRoom", { success: false, error: "Room is full" });
      if (sockets.find((s) => s.data.user.username === socket.data.user.username)) return socket.emit("joinRoom", { success: false, alreadyIn: true, error: "You are already in this room" });

      socket.rooms.forEach((user_room) => {
        socket.leave(user_room);
        updateMembers(user_room);
        socket.to(user_room).emit("message", {
          system: true,
          message: `${socket.data.user.username} left the room`
        });
      });
      
      socket.join(id);
     

      updateMembers(id);
      socket.emit("joinRoom", { success: true, data: room });
      socket.to(id).emit("message", {
        system: true,
        message: `${socket.data.user.username} joined the room`
      });
    });

    socket.on("joinRoomStranger", async data => {
      const { id, password } = data;
      if (!id) return socket.emit("joinRoomStranger", { success: false, error: "Room id is required" });
      if (!io.sockets.adapter.rooms[id]) return socket.emit("joinRoomStranger", { success: false, error: "Room not found" });

      const room = io.sockets.adapter.rooms[id];
      if (room.password && room.password !== password) return socket.emit("joinRoomStranger", { success: false, error: "Wrong password" });
      const sockets = await io.in(id).fetchSockets();
      if (sockets.length >= room.maxUsers) return socket.emit("joinRoomStranger", { success: false, error: "Room is full" });
      if (sockets.find((s) => s.data.user.username === socket.data.user.username)) return socket.emit("joinRoomStranger", { success: false, alreadyIn: true, error: "You are already in this room" });

      socket.rooms.forEach((user_room) => {
        socket.leave(user_room);
        updateMembers(user_room);
        socket.to(user_room).emit("message", {
          system: true,
          message: `${socket.data.user.username} left the room`
        });
      });
      
      socket.join(id);

     


      updateMembers(id);
      socket.emit("joinRoomStranger", { success: true, data: room });
      socket.to(id).emit("message", {
        system: true,
        message: `A stranger joins the room`
      });
    });

    // Fetch comments for a post
    socket.on("fetchComments", async ({ postId }) => {
      const rows = await db.all(
        `SELECT c.*, pc.commenter_index FROM pulse_comments c LEFT JOIN pulse_commenters pc ON pc.post_id = c.post_id AND pc.commenter_email = c.email WHERE c.post_id = $1 ORDER BY c.timestamp ASC`,
        postId
      );
      socket.emit("comments", { postId, comments: rows });
    });
    

    socket.on("fetchUserComments", async () => {
  const user = socket.data.user;

  if (!user || !user.email) {
    socket.emit("userComments", []);
    return;
  }

  try {
    const rows = await db.all(
      `SELECT c.*, pc.commenter_index 
       FROM pulse_comments c 
       LEFT JOIN pulse_commenters pc 
       ON pc.post_id = c.post_id AND pc.commenter_email = c.email 
       WHERE c.email = $1 
       ORDER BY c.timestamp DESC`,
      [user.email]
    );
    socket.emit("userComments", rows);
  } catch (err) {
    console.error("Error fetching user comments:", err);
    socket.emit("userComments", []);
  }
});


// Add new comment
socket.on("newComment", async (comment) => {
  // grab the post’s author email
  const post = await db.get(
    "SELECT email FROM pulse_posts WHERE id = $1",
    comment.post_id
  );

  // if it’s not the OP, ensure we have an index for them
  if (comment.email !== post.email) {
    const existing = await db.get(
      `"SELECT commenter_index FROM pulse_commenters WHERE post_id = $1 AND commenter_email = $2"
`,
      comment.post_id,
      comment.email
    );

    if (!existing) {
      // find the current max index, default to 0
      const { commenter_index: max = 0 } = (await db.get(
        `SELECT MAX(commenter_index) AS commenter_index FROM pulse_commenters WHERE post_id = $1`,
        comment.post_id
      )) || {};

      const next = max + 1;
      await db.run(
        `INSERT INTO pulse_commenters (post_id, commenter_email, commenter_index) VALUES ($1, $2, $3)`,
        [comment.post_id,
        comment.email,
        next]
      );
      comment.commenter_index = next;
    } else {
      comment.commenter_index = existing.commenter_index;
    }
  } else {
    // OP gets no number
    comment.commenter_index = null;
  }

  // now insert into pulse_comments (including email!)
  await db.run(
    `INSERT INTO pulse_comments (id, post_id, parent_id, message, timestamp, email) VALUES ($1, $2, $3, $4, $5, $6)`,
    comment.id,
    comment.post_id,
    comment.parent_id,
    comment.message,
    comment.timestamp,
    comment.email
  );

  // emit the enriched comment
  io.emit("newComment", comment);
});



    socket.on("leaveRoom", async () => {
      const room = Array.from(socket.rooms).find(room => room !== socket.id);
      if (!room) return socket.emit("leaveRoom", { success: false, error: "You are not in a room" });
      socket.leaveAll();
      socket.join("global");
      socket.emit("leaveRoom", { success: true });

      updateMembers(room);
      socket.to(room).emit("message", {
        system: true,
        message: `${socket.data.user.username} left the room`
      });
    });

    socket.on("leaveRoomStranger", async () => {
      const room = Array.from(socket.rooms).find(room => room !== socket.id);
      if (!room) return socket.emit("leaveRoomStranger", { success: false, error: "You are not in a room" });
      socket.leaveAll();
      socket.join("global");
      socket.emit("leaveRoomStranger", { success: true });

      socket.to(room).emit("ClearMessages", {
        success: true,
      });


      updateMembers(room);
      socket.to(room).emit("message", {
        system: true,
        message: `Stranger left the room`
      });
      
    });

    socket.on("ClearMessages", async () => {
      socket.emit("ClearMessages", { success: true });
    });

    socket.on("IsTypping", async () => {
      const room = Array.from(socket.rooms).find(room => room !== socket.id);
      socket.to(room).emit("IsTypping", {
        success: true,
        user: socket.data.user,
      });
      
    });

    socket.on("roomMembers", async () => {
      const room = Array.from(socket.rooms).find(room => room !== socket.id);
      if (!room) return socket.emit("roomMembers", { success: false, error: "You are not in a room" });

      updateMembers(room);
    });

    function updateMembers(room) {
      io.in(room).fetchSockets().then(sockets => {
        const members = sockets.map(socket => socket.data.user);
        if (members.length > 0) {
          io.in(room).emit("roomMembers", { success: true, data: members });
        } else {
          delete io.sockets.adapter.rooms[room];
        }
      });
    }

    socket.on("message", async data => {
      const room = Array.from(socket.rooms).find(room => room !== socket.id);
      const username = socket.data.user?.username;


      if (!room) return;

      const roomInfo = io.sockets.adapter.rooms[room];
      const isAnon = roomInfo?.anonymous;
      const userPayload = isAnon ? { username: "Anonymous" } : socket.data.user;

      var message = {
      user: userPayload,
      message: data.message,
      date: new Date(),
      };

      if (username && db) {
        await db.run(`
          INSERT INTO message_counts (username, count)
          VALUES (?, 1)
          ON CONFLICT(username) DO UPDATE SET count = count + 1
        `, [username]);
      }

      if (data.file && data.type == "image/jpeg" || data.type == "image/png" ){
        message = {
          user: socket.data.user,
          message: data.message,
          date: new Date(),
          file: data.file,
          type: data.type,
        };
      }



      const sockets = await io.in(room).fetchSockets();
      sockets.forEach(s => {
        s.emit("message", {
          ...message,
          self: s.id === socket.id
        });
      });
    });

    socket.on("fetchRoom", async () => {
  const room = Array.from(socket.rooms).find(room => room !== socket.id);
  if (!room) return socket.emit("fetchRoom", { success: false, error: "You are not in a room" });

  const roomData = io.sockets.adapter.rooms[room];
  socket.emit("fetchRoom", {
    success: true,
    data: {
      id: room,
      name: roomData?.name,
      owner: roomData?.owner,
      anonymous: roomData?.anonymous, 
      password: roomData?.password,
      maxUsers: roomData?.maxUsers
    }
  });
});



    socket.on("disconnect", (data) => {
      socket.rooms.forEach(room => {
        socket.to(room).emit("message", {
          system: true,
          message: `${socket.data.user.username} left the room`
        });

        updateMembers(room);
      });
      socket.leaveAll();
    });
  });

  res.end();

};