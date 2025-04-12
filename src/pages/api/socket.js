import { mainConfig } from "config/config";
import { Server } from "socket.io";
import { initDb } from '../../libraries/statsDb'; 


export default (async (req, res) => {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  let db;

  (async () => {
  db = await initDb();
  })();


  const io = new Server(res.socket.server, {
    pingInterval: 10000,
    pingTimeout: 5000
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
            const posts = await db.all("SELECT * FROM pulse_posts ORDER BY timestamp DESC LIMIT 50");
            socket.emit("posts", posts);
          } catch (err) {
            console.error("Error fetching Pulse posts:", err);
            socket.emit("posts", []);
          }
        });
    
        socket.on("newPost", async (post) => {
          try {
            await db.run(
              "INSERT INTO pulse_posts (id, message, timestamp, votes) VALUES (?, ?, ?, ?)",
              post.id,
              post.message,
              post.timestamp,
              post.votes
            );
            io.emit("newPost", post);
          } catch (err) {
            console.error("Error inserting Pulse post:", err);
          }
        });
    
        socket.on("votePost", async ({ id, type }) => {
          try {
            const change = type === "up" ? 1 : -1;
            await db.run("UPDATE pulse_posts SET votes = votes + ? WHERE id = ?", change, id);
            const updated = await db.get("SELECT id, votes FROM pulse_posts WHERE id = ?", id);
            io.emit("voteUpdate", updated);
          } catch (err) {
            console.error("Error updating vote:", err);
          }
        });
    

    socket.on("fetchLeaderboard", async () => {
      try {
        const messages = await db.all("SELECT * FROM message_counts ORDER BY count DESC LIMIT 10");
        const rooms = await db.all("SELECT * FROM room_joins ORDER BY count DESC LIMIT 10");
        console.log("Emitting leaderboard: messages:", messages, "rooms:", rooms);
        socket.emit("leaderboard", { messages, rooms });
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        socket.emit("leaderboard", { messages: [], rooms: [] });
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

    

    socket.on("UsersOnline", async () => {
      socket.emit("UsersOnline", { success: true });
    });

    socket.on("createRoom", data => {
      const { name, password, maxUsers } = data;
      if (!name) return socket.emit("createRoom", { success: false, error: "Name is required" });
      if (io.sockets.adapter.rooms[name]) return socket.emit("createRoom", { success: false, error: "Room already exists" });
      let room = {
        id: Math.random().toString(36).substring(2, 9),
        name: name.replace(/[^a-zA-Z0-9 ]/g, ""),
        owner: socket.data.user,
        users: 1,
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
  const comments = await db.all("SELECT * FROM pulse_comments WHERE post_id = ? ORDER BY timestamp ASC", postId);
  socket.emit("comments", { postId, comments });
});

// Add new comment
socket.on("newComment", async (comment) => {
  await db.run(
    `INSERT INTO pulse_comments (id, post_id, parent_id, message, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    comment.id,
    comment.post_id,
    comment.parent_id,
    comment.message,
    comment.timestamp
  );
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

      var message = {
        user: socket.data.user,
        message: data.message,
        date: new Date(),
      }

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

      socket.emit("fetchRoom", { success: true, data: io.sockets.adapter.rooms[room] });
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

});