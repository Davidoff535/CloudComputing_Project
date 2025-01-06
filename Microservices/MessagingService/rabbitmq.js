const amqp = require('amqplib');

let channel;
let connection; 

async function connectRabbitMQ() {
    try {
        connection = await amqp.connect({
            hostname: process.env.RABBITMQ_HOST,
            port: process.env.RABBITMQ_PORT,
            username: process.env.RABBITMQ_USER,
            password: process.env.RABBITMQ_PASSWORD,
        });

        
        channel = await connection.createChannel();

        
        const queue = 'message-events';
        await channel.assertQueue(queue, { durable: false });

        console.log('Connected to RabbitMQ and channel is ready.');

        
        connection.on('close', () => {
            console.error('RabbitMQ connection closed. Attempting to reconnect...');
            reconnectRabbitMQ();
        });

        
        connection.on('error', (err) => {
            console.error('RabbitMQ connection error:', err);
            reconnectRabbitMQ();
        });
    } catch (err) {
        console.error('Failed to connect to RabbitMQ:', err);
        setTimeout(connectRabbitMQ, 5000);
    }
}

async function reconnectRabbitMQ() {
    try {
        if (connection) {
            await connection.close();
        }
    } catch (err) {
        console.error('Error closing RabbitMQ connection:', err);
    }
    connectRabbitMQ();
}

async function sendMessageToQueue(message) {
    try {
        while (!channel) {
            throw new Error('RabbitMQ channel is not initialized.');
        }
        const queue = 'message-events';
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
        console.log('Message sent:', message);
    } catch (err) {
        console.error('Failed to send message to RabbitMQ:', err);
    }
}

connectRabbitMQ();

module.exports = { sendMessageToQueue };
