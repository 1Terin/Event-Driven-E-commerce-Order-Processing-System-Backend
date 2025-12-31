# Real-Time Order Processing System

## Overview

A production-style, event-driven order processing system that demonstrates how high-scale platforms ingest, process, and react to events asynchronously using AWS serverless and streaming services.

The system is intentionally designed with **one interactive entry point (API ingestion)**.  
All downstream behavior is **reactive, decoupled, and observable**, mirroring real-world production architectures used at scale.

---

## Architecture Flow

Client
  ↓
API Gateway
  ↓
Order Ingestion Lambda
  ↓
Kinesis (OrderEvents Stream)
  ↓
Order Consumer Lambda
  ├─ Idempotency check
  ├─ Persist order → DynamoDB
  └─ Start Step Functions execution (manual for demo)
          ↓
     Order State Machine
     (RECEIVED → COMPLETED / FAILED)
          ↓
     DynamoDB Updates
          ↓
DynamoDB Streams
  ↓
EventBridge
  ↓
Notifications / Metrics / Future Consumers

---

## Core Features

- Real-time order ingestion API  
- Event streaming via Amazon Kinesis  
- Asynchronous processing with Lambda consumers  
- Idempotent consumer logic (safe retries)  
- Distributed state transitions using AWS Step Functions  
- Failure handling with DLQs and replay mechanisms  
- Event-driven notifications  
- API throttling and rate limiting  
- Full observability using Amazon CloudWatch  

---

## Tech Stack

**API Layer**  
- Amazon API Gateway  
- AWS Lambda (Node.js)

**Streaming & Processing**  
- Amazon Kinesis  
- AWS Lambda consumers

**State Management**  
- AWS Step Functions

**Data & Messaging**  
- Amazon DynamoDB  
- DynamoDB Streams  
- Amazon EventBridge

**Caching**  
- DynamoDB DAX (provisioned)

**Failure Handling**  
- Amazon SQS (Dead Letter Queues)

**Observability**  
- Amazon CloudWatch (logs, metrics, alarms)

**Deployment**  
- AWS CDK (Infrastructure as Code)

---

## How to Test

### Order Ingestion

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "https://<api-id>.execute-api.<region>.amazonaws.com/prod/orders" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"item":"phone","amount":1}'
```

This single request triggers the entire asynchronous pipeline.

---

### Observe Downstream Behavior

After ingestion, the following can be observed:

- Order persisted in DynamoDB  
- Lambda executions in CloudWatch logs  
- DynamoDB Streams triggering downstream processing  
- Events flowing through EventBridge  
- Email notifications via SES  
- Messages routed to DLQs on failure  
- Step Functions executions visible in the AWS Console  

---

## Design Notes

- Step Functions are intentionally decoupled and triggered manually for demo clarity.  
  In production, they would be started by consumer Lambdas after validation steps.

- DynamoDB DAX is provisioned but not consumed, reflecting a write-heavy system.  
  Read APIs are intentionally out of scope.

- Authentication is simulated (IAM / JWT) to keep focus on system design.

- No frontend is included — this project focuses on backend architecture and distributed systems.

---

## Why This Project Matters

- Demonstrates distributed, event-driven system design at scale  
- Built end-to-end with production-grade failure handling, observability, and Infrastructure as Code
