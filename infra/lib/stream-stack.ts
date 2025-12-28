// infra/lib/stream-stack.ts

import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';

export class StreamStack extends Stack {
  public readonly orderEventBus: events.EventBus;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.orderEventBus = new events.EventBus(this, 'OrderEventBus', {
      eventBusName: 'order-events-bus',
    });
  }
}
