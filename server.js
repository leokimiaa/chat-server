const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://private-chat-amber.vercel.app",
    methods: ["GET", "POST"]
  }
});

let onlineUsers = {}; // <-- NEW: Object to store online users

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // <-- NEW: Listen for user joining
  socket.on("user_joined", (data) => {
    onlineUsers[socket.id] = data.user;
    console.log("Online users:", Object.values(onlineUsers));
    // Broadcast the updated list of names to everyone
    io.emit("online_status_update", Object.values(onlineUsers));
  });

  socket.on("send_message", async (data) => {
    try {
      const { error } = await supabase
        .from('chat_history')
        .insert([
          { 
            user_name: data.user, 
            message_text: data.message,
            sent_at_time: data.time 
          }
        ]);

      if (error) {
        console.error('Supabase insert error:', error);
      } else {
        socket.broadcast.emit("receive_message", data);
      }
    } catch (dbError) {
      console.error('Error saving message:', dbError);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
    // <-- NEW: Remove user from list on disconnect
    delete onlineUsers[socket.id];
    console.log("Online users:", Object.values(onlineUsers));
    // Broadcast the updated list
    io.emit("online_status_update", Object.values(onlineUsers));
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER IS RUNNING ON PORT ${PORT}`);
});