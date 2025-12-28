import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';

interface ComputeStackProps extends StackProps {
  ordersTable: dynamodb.Table;
  orderEventsStream: kinesis.Stream;
}

export class ComputeStack extends Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    /* =========================
       PHASE 2 — KINESIS CONSUMER
       ========================= */

    const orderConsumerRole = new iam.Role(this, 'OrderConsumerRole', {
      roleName: 'order-consumer-lambda-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    });

    const orderConsumerFn = new lambda.Function(this, 'OrderConsumerFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      role: orderConsumerRole,
      timeout: Duration.seconds(30),
      code: lambda.Code.fromAsset('../services/consumers/order-consumer', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash',
            '-c',
            [
              'npm install',
              'npx esbuild index.ts --bundle --platform=node --target=node20 --outfile=/asset-output/index.js',
            ].join(' && '),
          ],
        },
      }),
      environment: {
        ORDERS_TABLE: props.ordersTable.tableName,
      },
    });

    props.ordersTable.grantWriteData(orderConsumerFn);

    orderConsumerFn.addEventSource(
      new eventSources.KinesisEventSource(props.orderEventsStream, {
        batchSize: 10,
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        retryAttempts: 3,
      })
    );

    /* =====================================
       PHASE 3 — STREAM → EVENTBRIDGE + DLQ
       ===================================== */

    const streamDlq = new sqs.Queue(this, 'DynamoStreamProcessorDLQ', {
      queueName: 'dynamodb-stream-processor-dlq',
      retentionPeriod: Duration.days(14),
    });

    const streamRole = new iam.Role(this, 'DynamoStreamProcessorRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    });

    streamRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['events:PutEvents'],
        resources: ['*'],
      })
    );

    const streamFn = new lambda.Function(this, 'DynamoStreamProcessorFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: Duration.seconds(30),
      role: streamRole,
      deadLetterQueue: streamDlq,
      code: lambda.Code.fromAsset(
        '../services/stream-handlers/dynamodb-stream-processor',
        {
          bundling: {
            image: lambda.Runtime.NODEJS_20_X.bundlingImage,
            command: [
              'bash',
              '-c',
              [
                'npm install',
                'npx esbuild index.ts --bundle --platform=node --target=node20 --outfile=/asset-output/index.js',
              ].join(' && '),
            ],
          },
        }
      ),
      environment: {
        EVENT_BUS_NAME: 'order-events-bus',
      },
    });

    streamFn.addEventSource(
      new eventSources.DynamoEventSource(props.ordersTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 10,
        retryAttempts: 5,
        bisectBatchOnError: true,
      })
    );

    /* =========================
       DLQ REPLAY LAMBDA
       ========================= */

    const replayRole = new iam.Role(this, 'DlqReplayRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    });

    replayRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['events:PutEvents'],
        resources: ['*'],
      })
    );

    const dlqReplayFn = new lambda.Function(this, 'DlqReplayFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: Duration.seconds(30),
      role: replayRole,
      code: lambda.Code.fromAsset(
        '../services/stream-handlers/dlq-replay',
        {
          bundling: {
            image: lambda.Runtime.NODEJS_20_X.bundlingImage,
            command: [
              'bash',
              '-c',
              [
                'npm install',
                'npx esbuild index.ts --bundle --platform=node --target=node20 --outfile=/asset-output/index.js',
              ].join(' && '),
            ],
          },
        }
      ),
      environment: {
        EVENT_BUS_NAME: 'order-events-bus',
      },
    });

    dlqReplayFn.addEventSource(
      new eventSources.SqsEventSource(streamDlq, {
        batchSize: 10,
      })
    );
  }
}
