const amqp = require('amqplib');
const ws = require('./websocketManager')
async function consumeFriendshipMessages() {
    const connection = await amqp.connect({
        hostname: process.env.RABBITMQ_HOST,
        port: process.env.RABBITMQ_PORT,
        username: process.env.RABBITMQ_USER,
        password: process.env.RABBITMQ_PASSWORD
    });
    const channel = await connection.createChannel();

    const exchange = 'friendship-exchange';
    await channel.assertExchange(exchange, 'fanout', { durable: false });

    const { queue } = await channel.assertQueue('', { exclusive: true });

    channel.bindQueue(queue, exchange, '');

    console.log('Waiting for messages...');
    channel.consume(queue, (msg) => {
        console.log('Received:', msg.content.toString());
        const messageObject = JSON.parse(msg.content.toString());
        ws.sendEventToClient(messageObject,messageObject.to);
        channel.ack(msg);
    });
}

async function consumeMessageMessages() {
    const connection = await amqp.connect({
        hostname: process.env.RABBITMQ_HOST,
        port: process.env.RABBITMQ_PORT,
        username: process.env.RABBITMQ_USER,
        password: process.env.RABBITMQ_PASSWORD
    });
    const channel = await connection.createChannel();

    const exchange = 'message-exchange';
    await channel.assertExchange(exchange, 'fanout', { durable: false });

    const { queue } = await channel.assertQueue('', { exclusive: true });

    channel.bindQueue(queue, exchange, '');

    console.log('Waiting for messages...');
    channel.consume(queue, (msg) => {
        console.log('Received:', msg.content.toString());
        const messageObject = JSON.parse(msg.content.toString());
        ws.sendEventToClient(messageObject,messageObject.to);
        channel.ack(msg);
    });
}

consumeFriendshipMessages();
consumeMessageMessages();