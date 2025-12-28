import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as events from 'aws-cdk-lib/aws-events';

export class StreamStack extends Stack {
  public readonly orderEventsStream: kinesis.Stream;
  public readonly orderEventBus: events.EventBus;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Kinesis stream (Phase 1 / 2)
    this.orderEventsStream = new kinesis.Stream(this, 'OrderEventsStream', {
      streamName: 'OrderEvents',
      shardCount: 1,
      removalPolicy: RemovalPolicy.DESTROY, // dev only
    });

    // EventBridge bus (Phase 3+)
    this.orderEventBus = new events.EventBus(this, 'OrderEventBus', {
      eventBusName: 'order-events-bus',
    });
  }
}
