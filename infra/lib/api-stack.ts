import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';

interface ApiStackProps extends StackProps {
  orderEventsStream: kinesis.Stream;
}

export class ApiStack extends Stack {
  public readonly api: apigw.RestApi;

  /* =========================
     EXPOSED FOR OBSERVABILITY
     ========================= */
  public readonly orderIngestionFn: lambda.Function;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    /* =========================
       ORDER INGESTION LAMBDA
       ========================= */

    this.orderIngestionFn = new lambda.Function(this, 'OrderIngestionFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      timeout: Duration.seconds(10),
      code: lambda.Code.fromAsset('../services/api/order-ingestion', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          environment: {
            NPM_CONFIG_CACHE: '/tmp/.npm',
          },
          command: [
            'bash',
            '-c',
            [
              'npx esbuild handler.ts ' +
                '--bundle ' +
                '--platform=node ' +
                '--target=node20 ' +
                '--external:@aws-sdk/* ' +
                '--external:@smithy/* ' +
                '--outfile=/asset-output/handler.js',
            ].join(' && '),
          ],
        },
      }),
      environment: {
        ORDER_EVENTS_STREAM: props.orderEventsStream.streamName,
      },
    });

    props.orderEventsStream.grantWrite(this.orderIngestionFn);

    /* =========================
       API GATEWAY
       ========================= */

    this.api = new apigw.RestApi(this, 'OrdersApi', {
      restApiName: 'OrdersService',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 50,
        throttlingBurstLimit: 100,
      },
    });

    const orders = this.api.root.addResource('orders');
    orders.addMethod(
      'POST',
      new apigw.LambdaIntegration(this.orderIngestionFn)
    );
  }
}
