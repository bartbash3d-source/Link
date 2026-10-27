const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Optional: set CONTROL_KEY on Render to require a secret for /main.
// Then the controller opens /main?key=YOURSECRET. Leave unset for an open /main.
const CONTROL_KEY = process.env.CONTROL_KEY || "";

let currentColor = "#f2f2f2"; // kept in memory; resets when the server restarts
const clients = new Set();

app.use(express.json());

function authorized(req) {
  if (!CONTROL_KEY) return true;
  const given = String(req.get("x-control-key") || req.query.key || "");
  const a = Buffer.from(given);
  const b = Buffer.from(CONTROL_KEY);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Everyone else: just watches the color change (no buttons).
const indexPath = [
  path.join(__dirname, "public", "index.html"),
  path.join(__dirname, "index.html"),
].find(fs.existsSync);

app.get("/", (req, res) => {
  if (indexPath) return res.sendFile(indexPath);
  res.status(500).send("index.html not found. Files here: " + fs.readdirSync(__dirname).join(", "));
});

// The controller page. Lives outside /public so it can't be reached any other way.
app.get("/main", (req, res) => {
  if (!authorized(req)) return res.status(404).send("Not found");
  res.sendFile(path.join(__dirname, "control", "main.html"));
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

// The controller pressed a button: save the color and push it to everyone.
app.post("/color", (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: "wrong or missing key" });
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
