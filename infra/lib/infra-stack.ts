import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { DataStack } from './data-stack';
import { StreamStack } from './stream-stack';
import { ComputeStack } from './compute-stack';
import { ApiStack } from './api-stack';
import { ObservabilityStack } from './observability-stack';
import { WorkflowStack } from './workflow-stack';

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

    const workflowStack = new WorkflowStack(
      this,
      'WorkflowStack'
    );

    const apiStack = new ApiStack(this, 'ApiStack', {
      orderEventsStream: streamStack.orderEventsStream,
    });

    /* =========================
       COMPUTE (PHASE 2–4)
       ========================= */
    const computeStack = new ComputeStack(this, 'ComputeStack', {
      ordersTable: dataStack.ordersTable,
      orderEventsStream: streamStack.orderEventsStream,
      eventBus: streamStack.orderEventBus,
      daxEndpoint:
        dataStack.daxCluster.attrClusterDiscoveryEndpointUrl,
      orderStateMachine: workflowStack.orderStateMachine,
    });

    /* =========================
       OBSERVABILITY (PHASE 5)
       ========================= */
    new ObservabilityStack(this, 'ObservabilityStack', {
      orderIngestionFn: apiStack.orderIngestionFn,
      orderNotifierDlq: computeStack.orderNotifierDlq,
    });
  }
}
