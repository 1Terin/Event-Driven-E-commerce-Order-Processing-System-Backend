import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { DataStack } from './data-stack';
import { StreamStack } from './stream-stack';
import { ComputeStack } from './compute-stack';

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /* =========================
       DATA LAYER
       - DynamoDB
       - DAX
       ========================= */
    const dataStack = new DataStack(this, 'DataStack');

    /* =========================
       STREAMING / EVENTS
       - Kinesis
       - EventBridge
       ========================= */
    const streamStack = new StreamStack(this, 'StreamStack');

    /* =========================
       COMPUTE
       - API Lambdas
       - Consumers
       - Stream processors
       - Notifier
       ========================= */
    new ComputeStack(this, 'ComputeStack', {
      ordersTable: dataStack.ordersTable,
      orderEventsStream: streamStack.orderEventsStream,
      eventBus: streamStack.orderEventBus,
      daxEndpoint: dataStack.daxCluster.attrClusterDiscoveryEndpointUrl,
    });
  }
}
