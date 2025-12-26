import {
  Pass,
  Succeed,
  Result,
  Chain,
} from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

/**
 * Minimal order workflow:
 * RECEIVED → VALIDATED → COMPLETED
 */
export function createOrderStateMachine(scope: Construct) {
  const received = new Pass(scope, 'OrderReceived', {
    resultPath: '$.state',
    result: Result.fromObject({
      status: 'RECEIVED',
    }),
  });

  const validated = new Pass(scope, 'OrderValidated', {
    resultPath: '$.state',
    result: Result.fromObject({
      status: 'VALIDATED',
    }),
  });

  const completed = new Succeed(scope, 'OrderCompleted');

  const definition = Chain
    .start(received)
    .next(validated)
    .next(completed);

  return definition;
}
