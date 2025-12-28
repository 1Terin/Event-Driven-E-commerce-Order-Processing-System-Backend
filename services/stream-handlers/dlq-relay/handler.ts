import { SQSEvent } from 'aws-lambda';
import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';

const eb = new EventBridgeClient({});

export const handler = async (event: SQSEvent) => {
  const entries: PutEventsRequestEntry[] = [];

  for (const record of event.Records) {
    const body = JSON.parse(record.body);

    entries.push({
      EventBusName: process.env.EVENT_BUS_NAME!,
      Source: 'orders.dynamodb.replay',
      DetailType: 'REPLAY',
      Detail: JSON.stringify(body),
    });
  }

  for (let i = 0; i < entries.length; i += 10) {
    await eb.send(
      new PutEventsCommand({
        Entries: entries.slice(i, i + 10),
      })
    );
  }
};
