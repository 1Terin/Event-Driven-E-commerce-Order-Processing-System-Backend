#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { OrderProcessingStack } from '../lib/infra-stack';

const app = new cdk.App();
new OrderProcessingStack(app, 'OrderProcessingStack', {
  
});
