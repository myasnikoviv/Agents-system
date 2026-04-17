import { getRedisClient } from './redisClient';
import { RuntimeEvent } from '@system/events';

export class WorkerBus {
  private queueKey: string;
  private groupName: string;
  private consumerName: string;

  constructor(queueKey: string, groupName: string, consumerName: string) {
    this.queueKey = queueKey;
    this.groupName = groupName;
    this.consumerName = consumerName;
  }

  /**
   * Ensure the consumer group exists before attempting to read.
   */
  async ensureGroupExists(): Promise<void> {
    const redis = getRedisClient();
    try {
      // MKSTREAM will create the stream if it doesn't exist
      await redis.xgroup('CREATE', this.queueKey, this.groupName, '$', 'MKSTREAM');
      console.log(`[WorkerBus] Consumer group ${this.groupName} created/verified on ${this.queueKey}`);
    } catch (err: any) {
      if (err.message && err.message.includes('BUSYGROUP')) {
        // Group already exists, which is fine
        console.log(`[WorkerBus] Consumer group ${this.groupName} already exists.`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Block and listen for new events on the stream.
   * Uses XREADGROUP for consumer tracking.
   */
  async awaitNextTask(blockMs: number = 0): Promise<{ id: string, event: RuntimeEvent } | null> {
    const redis = getRedisClient();
    
    // '>' asks for incoming messages not delivered to any other consumer in the group
    const result = await (redis as any).xreadgroup(
      'GROUP', this.groupName, this.consumerName,
      'BLOCK', blockMs,
      'COUNT', 1,
      'STREAMS', this.queueKey, '>'
    );

    if (!result || result.length === 0) return null;

    const streamMatches = result[0] as any;
    const messages = streamMatches[1]; // Array of messages
    
    if (messages.length === 0) return null;

    const [messageId, messageFields] = messages[0];
    
    // Parse out 'data' field
    const dataIndex = messageFields.indexOf('data');
    if (dataIndex === -1) return null;

    const payloadString = messageFields[dataIndex + 1];
    const event = JSON.parse(payloadString) as RuntimeEvent;

    return { id: messageId.toString(), event };
  }

  /**
   * Acknowledge the task is completed so it drops from pending list.
   */
  async ackTask(messageId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.xack(this.queueKey, this.groupName, messageId);
    console.log(`[WorkerBus] ACKed msg ${messageId}`);
  }
}
