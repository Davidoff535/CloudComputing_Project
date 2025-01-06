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


connectDB().catch(error => {
    console.error(error);
    process.exit(1);
})

module.exports = {
    user: {
        addUser,
        findUserByUsername
    }
};
