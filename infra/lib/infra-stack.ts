import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';


export class OrderProcessingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB Orders Table
    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: 'Orders',
      partitionKey: {
        name: 'orderId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // dev-only
    });

    // Kinesis Stream for Order Events
    const orderEventsStream = new kinesis.Stream(this, 'OrderEventsStream', {
      streamName: 'OrderEvents',
      shardCount: 1,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const orderIngestionFn = new lambda.Function(this, 'OrderIngestionFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('../services/api/order-ingestion', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          environment: {
            NPM_CONFIG_CACHE: '/tmp/.npm',
          },
          command: [
            'bash', '-c',
            [
              'npm install',
              'npx esbuild handler.ts --bundle --platform=node --target=node20 --outfile=/asset-output/handler.js'
            ].join(' && ')
          ],
        },
      }),
      environment: {
        ORDER_EVENTS_STREAM: orderEventsStream.streamName,
      },
    });

    orderEventsStream.grantWrite(orderIngestionFn);

    const api = new apigw.RestApi(this, 'OrdersApi', {
      restApiName: 'Orders Service',
    });

    const orders = api.root.addResource('orders');
    orders.addMethod('POST', new apigw.LambdaIntegration(orderIngestionFn));
  }
}
