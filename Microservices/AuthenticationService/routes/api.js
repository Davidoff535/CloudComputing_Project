const express = require('express');
const router = express.Router();
const db = require('../database');
const ws = require('../websocketManager');

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (!req.jwtProvided) {
    console.log("Denied: Authentication required");
    return res.status(401).send('Authentication required');
  } else if (req.jwtVerifyError || req.jwtExpired) {
    console.log("Denied: Invalid authentication token");
    return res.status(401).send('Invalid authentication token');
  }
  next();
}

router.get('/friends/all', isLoggedIn, async (req, res) => {
  try {
    const user = await db.user.findUserByUsername(req.jwtPayload.username);
    const friendsOnly = await db.friends.findAllFriendsOfUser(req.jwtPayload.username);
    const friendsWithLastMessage = await db.messages.addLastMessageToEachFriend(user, friendsOnly);
    const friends = await db.messages.addUnreadMessageCountToEachFriend(user, friendsWithLastMessage);
    res.send({ status: 'success', message: 'Request successful', friends: friends });
  } catch (error) {
    res.status(500).send('Error fetching friends');
    console.error(error)
  }
});

router.get('/friends/outgoingRequests', isLoggedIn, async (req, res) => {
  try {
    const requests = await db.friends.findAllOutgoingFriendRequests(req.jwtPayload.username);
    res.send({ status: 'success', message: 'Request successful', requests: requests });
  } catch (error) {
    res.status(500).send('Error fetching requests');
    console.error(error)
  }
});

router.get('/friends/incomingRequests', isLoggedIn, async (req, res) => {
  try {
    const requests = await db.friends.findAllIncomingFriendRequests(req.jwtPayload.username);
    res.send({ status: 'success', message: 'Request successful', requests: requests });
  } catch (error) {
    res.status(500).send('Error fetching requests');
    console.error(error)
  }
});


router.post('/friends/sendRequest', isLoggedIn, async (req, res) => {
  try {
    const receiver = req.body.receiver_name;
    const from = await db.user.findUserByUsername(req.jwtPayload.username);
    const to = await db.user.findUserByUsername(receiver);
    if (!to) {
      res.status(400).send({ message: 'Username does not exist' });
      return;
    }
    if (from.username === to.username) {
      res.status(400).send({ message: 'Username is your own' });
      return;
    }
    const exists = await db.friends.existsFriendship(from, to);
    if (exists === "incoming") {
      res.status(409).send({ message: 'Incoming request already exists' });
    } else if (exists === "outgoing") {
      res.status(409).send({ message: 'Outgoing request already exists' });
    } else if (exists === "accepted") {
      res.status(409).send({ message: 'Already friends' });
    } else {
      await db.friends.createFriendRequest(from, to);
      ws.sendFriendRequestToClient({ firstname: from.firstname, lastname: from.lastname, username: from.username }, to.username);
      res.send({ status: 'success', message: 'Request successful', firstname: to.firstname, lastname: to.lastname, username: to.username });
    }
  } catch (error) {
    res.status(500).send('Error sending friend request');
    console.error(error)
  }
});

router.delete('/friends/cancelRequest/:friendship_name', isLoggedIn, async (req, res) => {
  try {
    const from = await db.user.findUserByUsername(req.jwtPayload.username);
    const to = await db.user.findUserByUsername(req.params.friendship_name);
    const deleted = await db.friends.deleteFriendRequest(from, to);
    if (deleted === "failed") {
      res.status(404).send({ message: 'Friend Request does not exist' });
    } else {
      ws.sendFriendRequestDeletionToClient({ username: from.username }, to.username);
      res.send({ status: 'success', message: 'Deletion successful' });
    }
  } catch (error) {
    res.status(500).send('Error deleting friend request');
    console.error(error)
  }
});

router.delete('/friends/declineRequest/:friendship_name', isLoggedIn, async (req, res) => {
  try {
    const to = await db.user.findUserByUsername(req.jwtPayload.username);
    const from = await db.user.findUserByUsername(req.params.friendship_name);
    const deleted = await db.friends.deleteFriendRequest(from, to);
    if (deleted === "failed") {
      res.status(404).send({ message: 'Friend Request does not exist' });
    } else {
      ws.sendFriendRequestDeclineToClient({ username: to.username }, from.username);
      res.send({ status: 'success', message: 'Deletion successful' });
    }
  } catch (error) {
    res.status(500).send('Error deleting friend request');
    console.error(error)
  }
});

router.put('/friends/acceptRequest/:friendship_name', isLoggedIn, async (req, res) => {
  try {
    const from = await db.user.findUserByUsername(req.jwtPayload.username);
    const to = await db.user.findUserByUsername(req.params.friendship_name);
    const accepted = await db.friends.acceptFriendRequest(to, from);
    if (accepted === "failed") {
      res.status(404).send({ message: 'Friend Request does not exist' });
    } else {
      ws.sendFriendRequestAcceptToClient({ firstname: from.firstname, lastname: from.lastname, username: from.username }, to.username);
      res.send({ status: 'success', message: 'Accept successful' });
    }
  } catch (error) {
    res.status(500).send('Error accepting friend request');
    console.error(error)
  }
});

router.post('/messages/send', isLoggedIn, async (req, res) => {
  try {
    const fromUser = await db.user.findUserByUsername(req.jwtPayload.username);
    const { toUsername, text } = req.body;
    if (!toUsername || !text) {
      return res.status(400).send({ message: 'Recipient username and message text are required' });
    }

    const toUser = await db.user.findUserByUsername(toUsername);

    if (!toUser) {
      return res.status(404).send({ message: 'Recipient not found' });
    }

    const msg = await db.messages.createMessage(fromUser, toUser, text);
    msg.fromUsername = fromUser.username;
    ws.sendMessageToClient(msg, toUser.username);
    res.send({ status: 'success', message: 'Message sent successfully', msg: msg });
  } catch (error) {
    res.status(500).send('Error sending message');
    console.error(error);
  }
});

router.get('/messages/all/:toUsername', isLoggedIn, async (req, res) => {
  try {
    const fromUser = await db.user.findUserByUsername(req.jwtPayload.username);
    const { toUsername } = req.params;

    if (!toUsername) {
      return res.status(400).send({ message: 'Recipient username is required' });
    }

    const toUser = await db.user.findUserByUsername(toUsername);

    if (!toUser) {
      return res.status(404).send({ message: 'Recipient not found' });
    }

    const messages = await db.messages.getAllMessages(fromUser, toUser);

    res.send({ status: 'success', messages: messages });
  } catch (error) {
    res.status(500).send('Error retrieving messages');
    console.error(error);
  }
});

router.put('/messages/markAsRead/:messageID', isLoggedIn, async (req, res) => {
  try {
    const user = await db.user.findUserByUsername(req.jwtPayload.username);
    const { messageID } = req.params;
    if (!messageID) {
      return res.status(400).send({ message: 'Message id is required' });
    }

    const message = await db.messages.markMessageAsRead(messageID, user);
    if (message) {
      try {
        const to = await db.user.findUserByID(message.sender_id);
        ws.sendMarkMessageReadToClient(message, to.username);
      } catch (error) {
        console.error(error);
      }
      res.send({ status: 'success' });
    } else {
      return res.status(404).send({ message: 'Message not found' });
    }
  } catch (error) {
    res.status(500).send('Error marking message as read');
    console.error(error);
  }
});


module.exports = router;