import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { KinesisStreamEvent } from 'aws-lambda';
import { putIfNotExists } from './shared/idempotency.service';
import { Order } from './shared/order';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: KinesisStreamEvent) => {
  for (const record of event.Records) {
    const payload = JSON.parse(
      Buffer.from(record.kinesis.data, 'base64').toString('utf-8')
    );

    const now = new Date().toISOString();

    const order: Order = {
      orderId: payload.orderId,
      status: 'RECEIVED',
      payload: payload.body,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await putIfNotExists(process.env.ORDERS_TABLE!, order);
    } catch (err: any) {
      // Idempotent behavior: duplicate events are ignored
      if (err.name !== 'ConditionalCheckFailedException') {
        throw err;
      }
    }
  }
};
