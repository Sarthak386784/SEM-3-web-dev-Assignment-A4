// npm init -y
// npm i socket.io
const express = require("express");
const http = require("http");

const { Server } = require("socket.io");

const app = express();
const httpserver = http.createServer(app);

const io = new Server(httpserver);

let count = 0;
io.on("connection", (socket) => {
  count++;
  console.log("Active user: ", count);

  // Sending
  socket.emit("gyankibaat", "welcome to socket.io server");

  socket.broadcast.emit("join", "New User Joined");

  //   Reading
  socket.on("kuchbhi", (msg) => {
    console.log(msg);
  });

  socket.on("disconnect", () => {
    count--;
    console.log("Active user: ", count);
  });

  io.emit("announcement", "Today is last time we study web dev -3");
});

httpserver.listen(8080, () => {
  console.log("Server started");
});

// =====================================================================
// ADDED FEATURE: chat rooms (everything above this line is unchanged)
// A second "connection" listener is attached, so the original handlers
// keep working exactly as before.
// =====================================================================
const path = require("path");
app.use(express.static(__dirname)); // open http://localhost:8080/chat.html

const rooms = new Map(); // name -> { owner, isPrivate, members:Set(socket.id) }
rooms.set("general", { owner: "system", isPrivate: false, members: new Set() });

const done = (ack, v) => typeof ack === "function" && ack(v);
const clean = (s, n) => String(s || "").trim().slice(0, n);
const publicRooms = () =>
  [...rooms.entries()]
    .filter(([, r]) => !r.isPrivate)
    .map(([name, r]) => ({ name, owner: r.owner, count: r.members.size }));
const membersOf = (name) =>
  [...rooms.get(name).members]
    .map((id) => io.sockets.sockets.get(id)?.data.username)
    .filter(Boolean);
const pushRooms = () => io.emit("rooms_update", publicRooms());
const pushMembers = (name) =>
  rooms.has(name) && io.to(name).emit("room_members", { room: name, members: membersOf(name) });

function joinRoom(socket, name) {
  const room = rooms.get(name);
  if (!room || room.members.has(socket.id)) return !!room;
  socket.join(name);
  room.members.add(socket.id);
  io.to(name).emit("room_system", { room: name, text: `${socket.data.username} joined` });
  pushMembers(name);
  pushRooms();
  return true;
}

function leaveRoom(socket, name) {
  const room = rooms.get(name);
  if (!room || !room.members.has(socket.id)) return;
  socket.leave(name);
  room.members.delete(socket.id);
  if (room.members.size === 0 && name !== "general") rooms.delete(name);
  else {
    io.to(name).emit("room_system", { room: name, text: `${socket.data.username} left` });
    pushMembers(name);
  }
  pushRooms();
}

io.on("connection", (socket) => {
  socket.data.username = "Guest" + Math.floor(1000 + Math.random() * 9000);

  socket.on("set_username", (name, ack) => {
    const u = clean(name, 20);
    if (!u) return done(ack, { ok: false, error: "Enter a name" });
    socket.data.username = u;
    for (const r of socket.rooms) pushMembers(r); // refresh member lists
    done(ack, { ok: true, username: u });
  });

  socket.on("list_rooms", (ack) => done(ack, publicRooms()));

  socket.on("create_room", ({ name, isPrivate } = {}, ack) => {
    const n = clean(name, 30);
    if (!n) return done(ack, { ok: false, error: "Room name required" });
    if (rooms.has(n)) return done(ack, { ok: false, error: "Room already exists" });
    rooms.set(n, { owner: socket.data.username, isPrivate: !!isPrivate, members: new Set() });
    joinRoom(socket, n);
    done(ack, { ok: true, room: n });
  });

  socket.on("join_room", (name, ack) => {
    const n = clean(name, 30);
    if (!joinRoom(socket, n)) return done(ack, { ok: false, error: "Room not found" });
    done(ack, { ok: true, room: n });
  });

  socket.on("leave_room", (name) => leaveRoom(socket, clean(name, 30)));

  socket.on("room_message", ({ room, text } = {}) => {
    const t = clean(text, 1000);
    if (!t || !socket.rooms.has(room)) return; // must be a member
    io.to(room).emit("room_message", {
      room, text: t, user: socket.data.username, id: socket.id, ts: Date.now(),
    });
  });

  socket.on("disconnecting", () => {
    for (const r of [...socket.rooms]) leaveRoom(socket, r);
  });
});
