// services/stream-handlers/dynamodb-stream-processor/handler.ts

import { DynamoDBStreamEvent } from 'aws-lambda';
import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';
import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const eb = new EventBridgeClient({});

const safeUnmarshall = (
  image?: Record<string, AttributeValue>
) => {
  if (!image) return null;
  return unmarshall(image as Record<string, AttributeValue>);
};

export const handler = async (event: DynamoDBStreamEvent) => {
  const entries: PutEventsRequestEntry[] = [];

  for (const record of event.Records) {
    // Only process INSERT / MODIFY / REMOVE
    if (!record.eventName || !record.dynamodb) continue;

    const newImage = safeUnmarshall(
      record.dynamodb.NewImage as Record<string, AttributeValue> | undefined
    );

    const oldImage = safeUnmarshall(
      record.dynamodb.OldImage as Record<string, AttributeValue> | undefined
    );

    const keys = safeUnmarshall(
      record.dynamodb.Keys as Record<string, AttributeValue> | undefined
    );

    entries.push({
      EventBusName: process.env.EVENT_BUS_NAME!,
      Source: 'orders.dynamodb',
      DetailType: record.eventName,
      Detail: JSON.stringify({
        keys,
        newImage,
        oldImage,
      }),
    });
  }

  // EventBridge allows max 10 entries per call
  for (let i = 0; i < entries.length; i += 10) {
    const batch = entries.slice(i, i + 10);

    const result = await eb.send(
      new PutEventsCommand({
        Entries: batch,
      })
    );

    // If ANY entry failed → fail Lambda → retries / DLQ kick in
    if (result.FailedEntryCount && result.FailedEntryCount > 0) {
      throw new Error(
        `EventBridge PutEvents failed: ${JSON.stringify(result.Entries)}`
      );
    }
  }
};
