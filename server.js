import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const app = express();
const server = createServer(app);
const io = new Server(server);
const allusers = {}; // Track all connected users

const __dirname = dirname(fileURLToPath(import.meta.url));

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, 'app/index.html'));
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Handle user joining
  socket.on("join-user", (username) => {
      allusers[username] = { username, id: socket.id };
      io.emit("joined", allusers); // Update user list for all
  });

  // Handle chat message
  socket.on("chat-message", ({ user, message, recipient }) => {
      if (recipient === "everyone") {
          io.emit("chat-message", { user, message, recipient }); // Broadcast message to all users
      } else {
          io.to(allusers[recipient].id).emit("chat-message", { user, message, recipient }); // Send only to selected recipient
          socket.emit("chat-message", { user, message, recipient }); // Show sender's message in their chat window
      }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
      for (const user in allusers) {
          if (allusers[user].id === socket.id) {
              delete allusers[user];
              break;
          }
      }
      io.emit("joined", allusers); // Update user list for all
  });
});

// Start the server
server.listen(9000, () => {
  console.log("Server is running on http://localhost:9000");
});
