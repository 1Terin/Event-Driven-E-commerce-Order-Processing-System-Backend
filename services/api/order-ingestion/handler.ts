import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { randomUUID } from 'crypto';

const kinesis = new KinesisClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const orderId = randomUUID();

  const payload = {
    orderId,
    body: event.body ? JSON.parse(event.body) : {},
    createdAt: new Date().toISOString(),
  };

  await kinesis.send(
    new PutRecordCommand({
      StreamName: process.env.ORDER_EVENTS_STREAM!,
      PartitionKey: orderId,
      Data: Buffer.from(JSON.stringify(payload)),
    })
  );

  return {
    statusCode: 202,
    body: JSON.stringify({
      message: 'Order accepted',
      orderId,
    }),
  };
};
