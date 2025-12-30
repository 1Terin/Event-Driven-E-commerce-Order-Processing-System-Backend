import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { DataStack } from './data-stack';
import { StreamStack } from './stream-stack';
import { ComputeStack } from './compute-stack';
import { ApiStack } from './api-stack';

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
       API (PHASE 1)
       ========================= */
    new ApiStack(this, 'ApiStack', {
      orderEventsStream: streamStack.orderEventsStream,
    });

    /* =========================
       COMPUTE (PHASE 2–4)
       ========================= */
    new ComputeStack(this, 'ComputeStack', {
      ordersTable: dataStack.ordersTable,
      orderEventsStream: streamStack.orderEventsStream,
      eventBus: streamStack.orderEventBus,
      daxEndpoint: dataStack.daxCluster.attrClusterDiscoveryEndpointUrl,
    });
  }
}
