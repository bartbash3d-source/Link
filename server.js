const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

let currentColor = "#f2f2f2"; // kept in memory; resets when the server restarts
const clients = new Set();

app.use(express.json());
const fs = require("fs");
const indexPath = [
  path.join(__dirname, "public", "index.html"),
  path.join(__dirname, "index.html"),
].find(fs.existsSync);

app.get("/", (req, res) => {
  if (indexPath) return res.sendFile(indexPath);
  res.status(500).send("index.html not found. Files here: " + fs.readdirSync(__dirname).join(", "));
});
app.use(express.static(path.join(__dirname, "public")));

// Each visitor opens this stream and gets color updates pushed to them.
app.get("/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ color: currentColor })}\n\n`);
  clients.add(res);
  req.on("close", () => clients.delete(res));
});

// A visitor pressed a button: save the color and push it to everyone.
app.post("/color", (req, res) => {
  const color = req.body && req.body.color;
  if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) {
    return res.status(400).json({ error: "color must be a hex value like #e63946" });
  }
  currentColor = color;
  const message = `data: ${JSON.stringify({ color })}\n\n`;
  clients.forEach((client) => client.write(message));
  res.sendStatus(204);
});

// Keeps connections from being closed for being idle.
setInterval(() => clients.forEach((client) => client.write(": ping\n\n")), 25000);

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
