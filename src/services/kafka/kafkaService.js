import logger from '../../utils/logger.js';

const DEFAULT_CLIENT_ID = 'dc-app';
const DEFAULT_TOPIC = 'notifications';

let kafka = null;
let producer = null;
let initialized = false;
let enabled = false;
let kafkaModule = null;

const parseBoolean = (value) => String(value).toLowerCase() === 'true';

const getKafkaConfig = () => {
  const kafkaEnabled = parseBoolean(process.env.KAFKA_ENABLED ?? 'false');
  const brokers = (process.env.KAFKA_BROKERS ?? '')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);

  return {
    enabled: kafkaEnabled,
    clientId: process.env.KAFKA_CLIENT_ID || DEFAULT_CLIENT_ID,
    topic: process.env.KAFKA_NOTIFICATIONS_TOPIC || DEFAULT_TOPIC,
    brokers
  };
};

const loadKafkaModule = async () => {
  if (kafkaModule) {
    return kafkaModule;
  }

  try {
    kafkaModule = await import('kafkajs');
    return kafkaModule;
  } catch (error) {
    logger.error(`KafkaJS is not available: ${error.message}`);
    return null;
  }
};

export const initKafka = async () => {
  if (initialized) {
    return enabled;
  }

  const config = getKafkaConfig();
  enabled = config.enabled;

  if (!enabled) {
    initialized = true;
    logger.info('Kafka disabled via KAFKA_ENABLED=false.');
    return false;
  }

  if (config.brokers.length === 0) {
    logger.warn('Kafka enabled but KAFKA_BROKERS is empty. Kafka publishing is disabled.');
    enabled = false;
    initialized = true;
    return false;
  }

  const loadedKafkaModule = await loadKafkaModule();
  if (!loadedKafkaModule) {
    enabled = false;
    initialized = true;
    return false;
  }

  const { Kafka } = loadedKafkaModule;

  kafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers
  });

  producer = kafka.producer();

  try {
    await producer.connect();
    initialized = true;
    logger.info(`Kafka producer connected. Topic: ${config.topic}.`);
    return true;
  } catch (error) {
    logger.error(`Failed to connect Kafka producer: ${error.message}`);
    producer = null;
    kafka = null;
    enabled = false;
    initialized = true;
    return false;
  }
};

export const publishNotificationEvent = async (payload) => {
  const config = getKafkaConfig();

  if (!initialized) {
    await initKafka();
  }

  if (!enabled || !producer) {
    return false;
  }

  try {
    await producer.send({
      topic: config.topic,
      messages: [
        {
          key: String(payload.user_id),
          value: JSON.stringify(payload)
        }
      ]
    });

    return true;
  } catch (error) {
    logger.error(`Failed to publish notification event to Kafka: ${error.message}`);
    return false;
  }
};

export const disconnectKafka = async () => {
  if (!producer) {
    return;
  }

  try {
    await producer.disconnect();
    logger.info('Kafka producer disconnected.');
  } catch (error) {
    logger.error(`Error while disconnecting Kafka producer: ${error.message}`);
  } finally {
    producer = null;
    kafka = null;
    initialized = false;
    enabled = false;
  }
};
