const express = require('express');
const router = express.Router();
var db = require('../database');
var rabbit = require('../rabbitmq');
let channel; // Persistent channel
let connection; // Persistent connection

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

router.get('/all', isLoggedIn, async (req, res) => {
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

router.get('/outgoingRequests', isLoggedIn, async (req, res) => {
  try {
    const requests = await db.friends.findAllOutgoingFriendRequests(req.jwtPayload.username);
    res.send({ status: 'success', message: 'Request successful', requests: requests });
  } catch (error) {
    res.status(500).send('Error fetching requests');
    console.error(error)
  }
});

router.get('/incomingRequests', isLoggedIn, async (req, res) => {
  try {
    const requests = await db.friends.findAllIncomingFriendRequests(req.jwtPayload.username);
    res.send({ status: 'success', message: 'Request successful', requests: requests });
  } catch (error) {
    res.status(500).send('Error fetching requests');
    console.error(error)
  }
});


router.post('/sendRequest', isLoggedIn, async (req, res) => {
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
      rabbit.sendMessageToQueue({type:'newFriendRequest', value:{firstname: from.firstname, lastname: from.lastname, username: from.username}, to: to.username });
      res.send({ status: 'success', message: 'Request successful', firstname: to.firstname, lastname: to.lastname, username: to.username });
    }
  } catch (error) {
    res.status(500).send('Error sending friend request');
    console.error(error)
  }
});

router.delete('/cancelRequest/:friendship_name', isLoggedIn, async (req, res) => {
  try {
    const from = await db.user.findUserByUsername(req.jwtPayload.username);
    const to = await db.user.findUserByUsername(req.params.friendship_name);
    const deleted = await db.friends.deleteFriendRequest(from, to);
    if (deleted === "failed") {
      res.status(404).send({ message: 'Friend Request does not exist' });
    } else {
      rabbit.sendMessageToQueue({type:'deleteFriendRequest', value:{username: from.username}, to: to.username });
      res.send({ status: 'success', message: 'Deletion successful' });
    }
  } catch (error) {
    res.status(500).send('Error deleting friend request');
    console.error(error)
  }
});

router.delete('/declineRequest/:friendship_name', isLoggedIn, async (req, res) => {
  try {
    const to = await db.user.findUserByUsername(req.jwtPayload.username);
    const from = await db.user.findUserByUsername(req.params.friendship_name);
    const deleted = await db.friends.deleteFriendRequest(from, to);
    if (deleted === "failed") {
      res.status(404).send({ message: 'Friend Request does not exist' });
    } else {
      rabbit.sendMessageToQueue({type:'declineFriendRequest', value:{username: from.username}, to: to.username });
      res.send({ status: 'success', message: 'Deletion successful' });
    }
  } catch (error) {
    res.status(500).send('Error deleting friend request');
    console.error(error)
  }
});

router.put('/acceptRequest/:friendship_name', isLoggedIn, async (req, res) => {
  try {
    const from = await db.user.findUserByUsername(req.jwtPayload.username);
    const to = await db.user.findUserByUsername(req.params.friendship_name);
    const accepted = await db.friends.acceptFriendRequest(to, from);
    if (accepted === "failed") {
      res.status(404).send({ message: 'Friend Request does not exist' });
    } else {
      rabbit.sendMessageToQueue({type:'acceptFriendRequest', value:{firstname: from.firstname, lastname: from.lastname, username: from.username}, to: to.username });
      res.send({ status: 'success', message: 'Accept successful' });
    }
  } catch (error) {
    res.status(500).send('Error accepting friend request');
    console.error(error)
  }
});


router.get('/getInfo', isLoggedIn, async function (req, res) {
  try {
      const user = await db.user.findUserByUsername(req.jwtPayload.username);
      if (!user) {
          return res.status(404).send({ status: 'fail', message: 'User not found' });
      }

      const { password, ...userInfo } = user;
      res.send({ status: 'success', user: userInfo });
  } catch (error) {
      res.status(500).send({ status: 'fail', message: 'Server error' });
  }
});

module.exports = router;

router.put('/update', isLoggedIn, async function (req, res) {
  const { firstname, lastname, newPW, oldPW, profilePicture } = req.body;
  try {
      const user = await db.user.findUserByUsername(req.jwtPayload.username);
      if (!user) {
          return res.status(404).send({ status: 'fail', message: 'User not found' });
      }
      if (!oldPW) {
          return res.status(400).send({ status: 'fail', message: 'No old password provided' });
      }
      if (!(await bcrypt.compare(oldPW, user.password))) {
          return res.status(401).send({ status: 'fail', message: 'Invalid old password' });
      }


      const updatedData = {};
      if (firstname) updatedData.firstname = firstname;
      if (lastname) updatedData.lastname = lastname;
      if (profilePicture) updatedData.profilePicture = profilePicture;
      if (newPW) updatedData.password = await bcrypt.hash(newPW, saltRounds);

      await db.user.updateUserByUsername(user.username, updatedData);
      await notifyAllFriends(user);
      res.send({ status: 'success', message: 'User information updated successfully' });
  } catch (error) {
      res.status(500).send({ status: 'fail', message: 'Server error' });
  }
});

async function notifyAllFriends(user) {
  try {
      const { password, ...userInfo } = await db.user.findUserByUsername(user.username);
      const friends = await db.friends.findAllFriendsOfUser(user.username);
      friends.forEach(friend => {
          //ws.sendUserUpdatedToClient(userInfo, friend.username);
          rabbit.sendMessageToQueue({type:'userUpdated', value: userInfo, to: to.username });

      });
  } catch (error) {
      console.error(error);
  }
}

module.exports = router;