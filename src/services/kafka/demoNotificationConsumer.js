import { Kafka } from 'kafkajs';

const parseBoolean = (value) => String(value).toLowerCase() === 'true';

const startDemoNotificationConsumer = async () => {
  const enabled = parseBoolean(process.env.KAFKA_ENABLED ?? 'false');
  if (!enabled) {
    console.log('Kafka demo consumer: KAFKA_ENABLED=false, nothing to consume.');
    return;
  }

  const brokers = (process.env.KAFKA_BROKERS ?? '')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);

  if (brokers.length === 0) {
    console.error('Kafka demo consumer: KAFKA_BROKERS is empty.');
    process.exit(1);
  }

  const clientId = process.env.KAFKA_CLIENT_ID || 'dc-app';
  const topic = process.env.KAFKA_NOTIFICATIONS_TOPIC || 'notifications';
  const groupId = process.env.KAFKA_DEMO_CONSUMER_GROUP_ID || 'dc-app-notifications-demo';

  const kafka = new Kafka({ clientId: `${clientId}-demo-consumer`, brokers });
  const consumer = kafka.consumer({ groupId });

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  console.log(`Kafka demo consumer connected. Topic: ${topic}. Group: ${groupId}.`);

  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      const key = message.key ? message.key.toString() : null;
      const value = message.value ? message.value.toString() : null;

      console.log('[Kafka demo consumer] message received', {
        topic,
        partition,
        offset: message.offset,
        key,
        value
      });
    }
  });

  const shutdown = async () => {
    await consumer.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startDemoNotificationConsumer().catch((error) => {
  console.error('Kafka demo consumer failed:', error);
  process.exit(1);
});
