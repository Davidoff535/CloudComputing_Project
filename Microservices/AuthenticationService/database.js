const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const dbUser = process.env.DB_USER;
if (!dbUser) {
    console.error('FATAL ERROR: DB_USER env var is not defined.');
    process.exit(1); // Exit the process with an error code
}

const dbPw = process.env.DB_PW;
if (!dbUser) {
    console.error('FATAL ERROR: DB_PW env var is not defined.');
    process.exit(1); // Exit the process with an error code
}

const uri = `mongodb+srv://${dbUser}:${dbPw}@textchat.u0nbidk.mongodb.net/?retryWrites=true&w=majority&appName=TextChat`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db = null;
let users = null;
let friendships = null;
let messages = null;


async function connectDB() {
    await client.connect();
    db = client.db('textchat'); // use your database name here
    users = db.collection('users');
    friendships = db.collection('friendships');
    messages = db.collection('messages');
    await db.command({ ping: 1 });
    console.log("Pinged DB successfully, connected to MongoDB!");
}

// Method to add a new user
async function addUser(user) {
    user.createdAt = new Date();
    user.updatedAt = new Date();
    return await users.insertOne(user);
}

async function findUserByUsername(username) {
    return await users.findOne({ username: username });
}

async function findUserByID(id) {
    return await users.findOne({ _id: id });
}

async function updateUserByUsername(username, updateData) {
    updateData.updatedAt = new Date();
    return await users.updateOne(
        { username: username },
        { $set: updateData }
    );
}

async function findAllFriendsOfUser(username) {
    const user = await findUserByUsername(username);
    const friendshipsRes = await friendships.find({
        $or: [
            { user1_id: user._id },
            { user2_id: user._id }
        ],
        status: "accepted"
    }).toArray();
    const friendIds = friendshipsRes.map(friendship => {
        return friendship.user1_id.equals(user._id) ? friendship.user2_id : friendship.user1_id;
    });
    return await users.find({ _id: { $in: friendIds } }).toArray();
}

async function addLastMessageToEachFriend(user, friends) {
    for (let friend of friends) {
        const lastMessage = await getLastMessageBetweenUsers(user._id, friend._id);
        friend.lastMessage = lastMessage;
    }
    return friends;
}

async function getLastMessageBetweenUsers(userId1, userId2) {
    const lastMessage = await messages.find({
        $or: [
            { sender_id: userId1, receiver_id: userId2 },
            { sender_id: userId2, receiver_id: userId1 }
        ]
    }).sort({ timestamp: -1 }).limit(1).toArray();
    if (lastMessage.length === 0) {
        return null;
    }
    lastMessage[0].incoming = lastMessage[0].sender_id.equals(userId2);
    return lastMessage[0];
}

async function addUnreadMessageCountToEachFriend(user, friends) {
    for (let friend of friends) {
        const unreadCount = await getUnreadMessageCount(user, friend);
        friend.unreadCount = unreadCount;
    }
    return friends;
}

async function getUnreadMessageCount(user1, user2) {
    const unreadMessageCount = await messages.countDocuments({
        sender_id: user2._id,
        receiver_id: user1._id,
        read: false
    });
    return unreadMessageCount;
}

async function findAllOutgoingFriendRequests(username) {
    const user = await users.findOne({ username });

    const outgoingRequests = await friendships.find({
        user1_id: user._id,
        status: "pending"
    }).toArray();
    const recipientIds = outgoingRequests.map(request => request.user2_id);
    return await users.find({ _id: { $in: recipientIds } }).toArray();
}

async function findAllIncomingFriendRequests(username) {
    const user = await users.findOne({ username });

    const outgoingRequests = await friendships.find({
        user2_id: user._id,
        status: "pending"
    }).toArray();
    const recipientIds = outgoingRequests.map(request => request.user1_id);
    return await users.find({ _id: { $in: recipientIds } }).toArray();
}

async function existsFriendship(user1, user2) {
    const outgoingRequest = await friendships.findOne({
        user1_id: user1._id,
        user2_id: user2._id,
        status: "pending"
    });

    if (outgoingRequest) {
        return "outgoing";
    }

    const incomingRequest = await friendships.findOne({
        user1_id: user2._id,
        user2_id: user1._id,
        status: "pending"
    });

    if (incomingRequest) {
        return "incoming";
    }

    const acceptedRequest = await friendships.findOne({
        $or: [
            { user1_id: user1._id, user2_id: user2._id },
            { user1_id: user2._id, user2_id: user1._id }
        ],
        status: "accepted"
    });

    if (acceptedRequest) {
        return "accepted";
    }

    return "none";
}

async function createFriendRequest(from, to) {
    const friendship = { user1_id: from._id, user2_id: to._id, status: "pending" };
    return (await friendships.insertOne(friendship)).insertedId;
}

async function deleteFriendRequest(from, to) {

    const result = await friendships.deleteOne({
        user1_id: from._id,
        user2_id: to._id,
        status: "pending"
    });
    console.log(result);
    if (result.deletedCount === 0) {
        return "failed";
    }

    return "success";
}

async function acceptFriendRequest(from, to) {
    const updateResult = await friendships.updateOne(
        { user1_id: from._id, user2_id: to._id, status: "pending" },
        { $set: { status: "accepted" } }
    );
    if (updateResult.modifiedCount !== 1) {
        return "failed";
    }
    return "success";
}

async function createMessage(from, to, text) {
    const message = {
        sender_id: from._id,
        receiver_id: to._id,
        text: text,
        timestamp: new Date(),
        read: false
    };
    message._id = (await messages.insertOne(message)).insertedId;
    return message;
}


async function getAllMessages(from, to) {
    const allMessages = await messages.find({
        $or: [
            { sender_id: from._id, receiver_id: to._id },
            { sender_id: to._id, receiver_id: from._id }
        ]
    }).sort({ timestamp: -1 }).toArray();

    const messagesWithSentField = allMessages.map(message => ({
        ...message,
        incoming: message.sender_id.equals(to._id)
    }));
    return messagesWithSentField;
}


async function markMessageAsRead(messageId, user) {
    const message = await messages.findOne({ _id: ObjectId.createFromHexString(messageId), receiver_id: user._id });
    if (message) {
        await messages.updateOne(
            { _id: ObjectId.createFromHexString(messageId) },
            { $set: { read: true } }
        );
    }

    return message;
}


connectDB().catch(error => {
    console.error(error);
    process.exit(1);
})

module.exports = {
    user: {
        addUser,
        findUserByUsername,
        findUserByID,
        updateUserByUsername
    },
    friends: {
        findAllFriendsOfUser,
        existsFriendship,
        createFriendRequest,
        deleteFriendRequest,
        findAllOutgoingFriendRequests,
        findAllIncomingFriendRequests,
        acceptFriendRequest
    },
    messages: {
        createMessage,
        getAllMessages,
        addLastMessageToEachFriend,
        getLastMessageBetweenUsers,
        getUnreadMessageCount,
        addUnreadMessageCountToEachFriend,
        markMessageAsRead,
    }
};
