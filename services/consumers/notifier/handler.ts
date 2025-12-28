import { EventBridgeEvent } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({});

export const handler = async (
  event: EventBridgeEvent<string, any>
) => {
  const detail = event.detail;

  const subject = `Order Event: ${event['detail-type']}`;
  const body = JSON.stringify(detail, null, 2);

  await ses.send(
    new SendEmailCommand({
      Source: process.env.NOTIFY_EMAIL!,
      Destination: {
        ToAddresses: [process.env.NOTIFY_EMAIL!],
      },
      Message: {
        Subject: {
          Data: subject,
        },
        Body: {
          Text: {
            Data: body,
          },
        },
      },
    })
  );
};
