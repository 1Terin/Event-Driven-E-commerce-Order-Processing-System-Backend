import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as dax from 'aws-cdk-lib/aws-dax';
import * as iam from 'aws-cdk-lib/aws-iam';

export class DataStack extends Stack {
  public readonly ordersTable: dynamodb.Table;
  public readonly daxCluster: dax.CfnCluster;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: 'Orders',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const daxRole = new iam.Role(this, 'DaxRole', {
      assumedBy: new iam.ServicePrincipal('dax.amazonaws.com'),
    });

    daxRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'dynamodb:GetItem',
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:BatchGetItem',
        ],
        resources: [this.ordersTable.tableArn],
      })
    );

    this.daxCluster = new dax.CfnCluster(this, 'OrdersDaxCluster', {
      clusterName: 'orders-dax-cluster',
      iamRoleArn: daxRole.roleArn,
      nodeType: 'dax.t3.small',
      replicationFactor: 1,
    });
  }
}
