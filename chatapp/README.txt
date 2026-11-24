HOW TO RUN
1. Extract this zip.
2. Open a terminal inside the "chatapp" folder.
3. Run:  node server-rooms.js
4. Open http://localhost:8080/chat.html in 2+ browser tabs and chat.

(Dependencies are already included. If node_modules is missing, run "npm install" first.)

FILES
server.js        - original backend, UNCHANGED
server-rooms.js  - same code as server.js + added chat-room feature (run this one)
chat.html        - new frontend
client.html      - original client, unchanged

Run only one server at a time (both use port 8080).
