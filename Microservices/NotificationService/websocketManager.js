const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const http = require('http')

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('FATAL ERROR: JWT_SECRET env var is not defined.');
  process.exit(1);
}


const clients = new Map();



function verifyJWT(token, callback) {
  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, decoded);
    }
  });
}


// Create an HTTP server
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  console.log("New websocket connection")
  const token = req.headers['sec-websocket-protocol'];

  if (!token) {
    ws.close(1008, 'Token is required');
    return;
  }

  verifyJWT(token, (err, decoded) => {
    if (err) {
      ws.close(1008, 'Invalid or expired token');
      return;
    }

    ws.jwtPayload = decoded;

    const username = decoded.username;
    clients.set(username, ws);
    console.log(`Client connected: ${username}, we now have ${clients.size} connected clients`);
    ws.on('close', () => {
      clients.delete(username);
      console.log(`Client disconnected, we now have ${wss.clients.size} connected clients`);
    });

  });
});

server.listen(80, () => {
  console.log('Server is listening on port 80');
});

function sendEventToClient(message, toUsername) {
  try {
    const messageJSON = JSON.stringify(message);
    const client = clients.get(toUsername);
    if (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageJSON);
        console.log(`> Sent message to client: ${client.jwtPayload.username}`);
      }
    }
  } catch (error) {
    console.log(`Failed to send message via websocket`);
    console.error(error);
  }
}

module.exports = {
  sendEventToClient,
};