const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yxzskaycstjhgwiiftmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4enNrYXljc3RqaGd3aWlmdG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDE1NzAsImV4cCI6MjA3MDQ3NzU3MH0.lKdaFJ4ACVzgK1kaPDBnyFuyu2EmCSUG1TrWZRCQVxs';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
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