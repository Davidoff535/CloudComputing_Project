const express = require('express');
const router = express.Router();
const db = require('../database');

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

router.post('/send', isLoggedIn, async (req, res) => {
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
    //ws.sendMessageToClient(msg, toUser.username);
    res.send({ status: 'success', message: 'Message sent successfully', msg: msg });
  } catch (error) {
    res.status(500).send('Error sending message');
    console.error(error);
  }
});

router.get('/all/:toUsername', isLoggedIn, async (req, res) => {
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

router.put('/markAsRead/:messageID', isLoggedIn, async (req, res) => {
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
        //ws.sendMarkMessageReadToClient(message, to.username);
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