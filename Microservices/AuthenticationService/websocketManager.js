const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('FATAL ERROR: JWT_SECRET env var is not defined.');
  process.exit(1);
}

const wss = new WebSocket.Server({ port: 3001 });
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

wss.on('connection', (ws, req) => {
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


function sendMessageToClient(message, toUsername) {
  try {
    const messageJSON = JSON.stringify({ type: 'newMessage', value: message });
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

function sendFriendRequestToClient(request, toUsername) {
  try {
    const requestJSON = JSON.stringify({ type: 'newFriendRequest', value: request });
    const client = clients.get(toUsername);
    if (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(requestJSON);
        console.log(`> Sent friend request to client: ${client.jwtPayload.username}`);
      }
    }
  } catch (error) {
    console.log(`Failed to send friend request via websocket`);
    console.error(error);
  }
}

function sendFriendRequestDeletionToClient(request, toUsername) {
  try {
    const requestJSON = JSON.stringify({ type: 'deleteFriendRequest', value: request });
    const client = clients.get(toUsername);
    if (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(requestJSON);
        console.log(`> Sent friend request deletion to client: ${client.jwtPayload.username}`);
      }
    }
  } catch (error) {
    console.log(`Failed to send friend request deletion via websocket`);
    console.error(error);
  }
}

function sendFriendRequestDeclineToClient(request, toUsername) {
  try {
    const requestJSON = JSON.stringify({ type: 'declineFriendRequest', value: request });
    const client = clients.get(toUsername);
    if (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(requestJSON);
        console.log(`> Sent friend request decline to client: ${client.jwtPayload.username}`);
      }
    }
  } catch (error) {
    console.log(`Failed to send friend request decline via websocket`);
    console.error(error);
  }
}

function sendFriendRequestAcceptToClient(request, toUsername) {
  try {
    const requestJSON = JSON.stringify({ type: 'acceptFriendRequest', value: request });
    const client = clients.get(toUsername);
    if (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(requestJSON);
        console.log(`> Sent friend request decline to client: ${client.jwtPayload.username}`);
      }
    }
  } catch (error) {
    console.log(`Failed to send friend request decline via websocket`);
    console.error(error);
  }
}

function sendMarkMessageReadToClient(message, toUsername) {
  try {
    const requestJSON = JSON.stringify({ type: 'markMessageRead', value: message });
    const client = clients.get(toUsername);
    if (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(requestJSON);
        console.log(`> Sent mark message as read to client: ${client.jwtPayload.username}`);
      }
    }
  } catch (error) {
    console.log(`Failed to send mark message as read via websocket`);
    console.error(error);
  }
}

function sendUserUpdatedToClient(newUser, toUsername) {
  try {
    const requestJSON = JSON.stringify({ type: 'userUpdated', value: newUser });
    const client = clients.get(toUsername);
    if (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(requestJSON);
        console.log(`> Sent updated user to client: ${client.jwtPayload.username}`);
      }
    }
  } catch (error) {
    console.log(`Failed to send updated user via websocket`);
    console.error(error);
  }
}
module.exports = {
  sendMessageToClient,
  sendFriendRequestToClient,
  sendFriendRequestDeletionToClient,
  sendFriendRequestDeclineToClient,
  sendFriendRequestAcceptToClient,
  sendMarkMessageReadToClient,
  sendUserUpdatedToClient
};