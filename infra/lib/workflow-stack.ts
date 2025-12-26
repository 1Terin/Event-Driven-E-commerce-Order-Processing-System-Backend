import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';

export class WorkflowStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /**
     * Order lifecycle:
     * RECEIVED → COMPLETED
     * (we will expand later)
     */

    const received = new sfn.Pass(this, 'OrderReceived', {
      result: sfn.Result.fromObject({
        status: 'RECEIVED',
      }),
      resultPath: '$.order',
    });

    const completed = new sfn.Pass(this, 'OrderCompleted', {
      result: sfn.Result.fromObject({
        status: 'COMPLETED',
      }),
      resultPath: '$.order',
    });

    const definition = received.next(completed);

    new sfn.StateMachine(this, 'OrderStateMachine', {
      definition,
    });
  }
}
