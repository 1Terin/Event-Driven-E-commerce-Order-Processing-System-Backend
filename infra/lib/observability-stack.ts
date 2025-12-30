import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';

interface ObservabilityStackProps extends StackProps {
  orderIngestionFn: lambda.Function;
  orderNotifierDlq: sqs.Queue;
}

export class ObservabilityStack extends Stack {
  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    /* =========================
       LAMBDA ERROR ALARM
       ========================= */

    new cloudwatch.Alarm(this, 'OrderIngestionErrorsAlarm', {
      metric: props.orderIngestionFn.metricErrors(),
      threshold: 5,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      alarmDescription: 'High error rate in Order Ingestion Lambda',
    });

    /* =========================
       DLQ BACKLOG ALARM
       ========================= */

    new cloudwatch.Alarm(this, 'OrderNotifierDlqAlarm', {
      metric:
        props.orderNotifierDlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Messages detected in Order Notifier DLQ',
    });
  }
}
