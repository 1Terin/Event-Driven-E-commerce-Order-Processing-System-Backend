import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as iam from 'aws-cdk-lib/aws-iam';

interface ComputeStackProps extends StackProps {
  ordersTable: dynamodb.Table;
  orderEventsStream: kinesis.Stream;
}

export class ComputeStack extends Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // ✅ Explicit IAM Role (this fixes ALL your errors)
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
      role: orderConsumerRole, // 👈 important
      timeout: Duration.seconds(30),
      code: lambda.Code.fromAsset('../services/consumers/order-consumer', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          environment: {
            NPM_CONFIG_CACHE: '/tmp/.npm',
          },
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
  }
}
