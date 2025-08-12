---
title: "Designing a Serverless Real-Time Chat with AWS WebSockets"
date: 2025-10-13T08:00:00-06:00
publishDate: 2025-10-13T10:00:00-06:00
description: "A practical, end-to-end plan for building a scalable chat service using API Gateway WebSockets, Lambda, and DynamoDB."
categories:
  - projects
  - backend
tags:
  - serverless
  - WebSockets
  - AWS
  - DynamoDB
menu:
  sidebar:
    name: "Real-Time Chat"
    identifier: serverless-chat
    parent: projects
    weight: 3
---

I want a clean, feasible plan for building a real-time chat service on AWS. Just an architecture I can deploy, test, and iterate on.

## Goals

* **Real time.** Messages appear for all clients in the same room.
* **Serverless scale.** Handle spikes without manual intervention.
* **Cost aware.** Pay only when used.
* **Simple to operate.** Clear metrics, alarms, and dead-letter handling.

## Architecture

**Core pieces**

1. **Amazon API Gateway WebSocket API**

   * Routes: `$connect`, `$disconnect`, `$default`, and `sendMessage`.
2. **AWS Lambda**

   * `onConnect` stores a connection record.
   * `onDisconnect` removes it.
   * `onMessage` writes a message and broadcasts to the room.
3. **Amazon DynamoDB**

   * `chat_connections` keyed by `roomId` and `connectionId`.
   * `chat_messages` keyed by `roomId` and `timestamp` for history and replay.
4. **IAM and Observability**

   * Minimal policies for DynamoDB and `execute-api:ManageConnections`.
   * CloudWatch metrics, alarms, and DLQs for resilience.

**Data model**

* `chat_connections`

  * PK `roomId` (S), SK `connectionId` (S)
  * attrs: `userId` (S), `connectedAt` (S ISO), `ttl` (N, optional)
* `chat_messages`

  * PK `roomId` (S), SK `timestamp` (S ISO)
  * attrs: `userId` (S), `message` (S), `metadata` (M)

This lets `onMessage` query connections for a room with a single `Query` call, then fan out with API Gateway Management API.

> Note: WebSockets originate from the client to AWS over `wss://`.

## Terraform plan

### WebSocket API and stage

```hcl
resource "aws_apigatewayv2_api" "chat" {
  name                       = "serverless-chat"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.chat.id
  name        = "$default"
  auto_deploy = true
}
```

### DynamoDB tables

```hcl
resource "aws_dynamodb_table" "connections" {
  name         = "chat_connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "roomId"
  range_key    = "connectionId"

  attribute { name = "roomId";       type = "S" }
  attribute { name = "connectionId"; type = "S" }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "messages" {
  name         = "chat_messages"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "roomId"
  range_key    = "timestamp"

  attribute { name = "roomId";   type = "S" }
  attribute { name = "timestamp"; type = "S" }
}
```

### Lambda functions, permissions, and routes

```hcl
# Role for all chat Lambdas
data "aws_caller_identity" "current" {}

resource "aws_iam_role" "chat_lambda_role" {
  name               = "chat-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.chat_assume.json
}

data "aws_iam_policy_document" "chat_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals { type = "Service", identifiers = ["lambda.amazonaws.com"] }
  }
}

data "aws_iam_policy_document" "chat_policy" {
  statement {
    actions = [
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:GetItem"
    ]
    resources = [
      aws_dynamodb_table.connections.arn,
      "${aws_dynamodb_table.connections.arn}/index/*",
      aws_dynamodb_table.messages.arn
    ]
  }
  statement {
    actions   = ["execute-api:ManageConnections"]
    resources = ["arn:aws:execute-api:${var.region}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.chat.id}/*"]
  }
  statement {
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "chat_inline" {
  name   = "chat-lambda-policy"
  policy = data.aws_iam_policy_document.chat_policy.json
}

resource "aws_iam_role_policy_attachment" "chat_attach" {
  role       = aws_iam_role.chat_lambda_role.name
  policy_arn = aws_iam_policy.chat_inline.arn
}

# Zip your handlers outside this snippet, or use an archive_file
resource "aws_lambda_function" "on_connect" {
  function_name = "chat-on-connect"
  role          = aws_iam_role.chat_lambda_role.arn
  handler       = "index.onConnect"
  runtime       = "nodejs20.x"
  filename      = "build/connect.zip"

  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    }
  }
}

resource "aws_lambda_function" "on_disconnect" {
  function_name = "chat-on-disconnect"
  role          = aws_iam_role.chat_lambda_role.arn
  handler       = "index.onDisconnect"
  runtime       = "nodejs20.x"
  filename      = "build/disconnect.zip"

  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    }
  }
}

resource "aws_lambda_function" "on_message" {
  function_name = "chat-on-message"
  role          = aws_iam_role.chat_lambda_role.arn
  handler       = "index.onMessage"
  runtime       = "nodejs20.x"
  filename      = "build/message.zip"

  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
      MESSAGES_TABLE    = aws_dynamodb_table.messages.name
      # APIGW domain and stage are read from the event
    }
  }
}

# Integrations
resource "aws_apigatewayv2_integration" "connect" {
  api_id                 = aws_apigatewayv2_api.chat.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.on_connect.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "disconnect" {
  api_id                 = aws_apigatewayv2_api.chat.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.on_disconnect.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "message" {
  api_id                 = aws_apigatewayv2_api.chat.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.on_message.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Routes
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.chat.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect.id}"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.chat.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect.id}"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.chat.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.message.id}"
}

resource "aws_apigatewayv2_route" "send" {
  api_id    = aws_apigatewayv2_api.chat.id
  route_key = "sendMessage"
  target    = "integrations/${aws_apigatewayv2_integration.message.id}"
}

# Invoke permissions
resource "aws_lambda_permission" "allow_connect" {
  statement_id  = "AllowAPIGatewayInvokeConnect"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.on_connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chat.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_disconnect" {
  statement_id  = "AllowAPIGatewayInvokeDisconnect"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.on_disconnect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chat.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_message" {
  statement_id  = "AllowAPIGatewayInvokeMessage"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.on_message.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chat.execution_arn}/*/*"
}
```

## Lambda handlers in TypeScript

`index.ts`:

```ts
import { DynamoDBClient, PutItemCommand, DeleteItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

const ddb = new DynamoDBClient({});
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;
const MESSAGES_TABLE = process.env.MESSAGES_TABLE!;

type WSHandler = (event: any) => Promise<any>;

export const onConnect: WSHandler = async (event) => {
  const roomId = event.queryStringParameters?.roomId || "lobby";
  const userId = event.queryStringParameters?.userId || "anonymous";
  const connectionId = event.requestContext.connectionId as string;
  const connectedAt = new Date().toISOString();

  await ddb.send(new PutItemCommand({
    TableName: CONNECTIONS_TABLE,
    Item: {
      roomId:       { S: roomId },
      connectionId: { S: connectionId },
      userId:       { S: userId },
      connectedAt:  { S: connectedAt },
      ttl:          { N: String(Math.floor(Date.now() / 1000) + 60 * 60 * 24) }
    }
  }));

  return { statusCode: 200 };
};

export const onDisconnect: WSHandler = async (event) => {
  const connectionId = event.requestContext.connectionId as string;
  const roomId = "lobby";

  await ddb.send(new DeleteItemCommand({
    TableName: CONNECTIONS_TABLE,
    Key: {
      roomId:       { S: roomId },
      connectionId: { S: connectionId }
    }
  }));

  return { statusCode: 200 };
};

export const onMessage: WSHandler = async (event) => {
  const { domainName, stage, connectionId } = event.requestContext;
  const body = JSON.parse(event.body || "{}");
  const roomId = body.roomId || "lobby";
  const userId = body.userId || "anonymous";
  const text = String(body.message || "").slice(0, 2000);
  const timestamp = new Date().toISOString();

  await ddb.send(new PutItemCommand({
    TableName: MESSAGES_TABLE,
    Item: {
      roomId:    { S: roomId },
      timestamp: { S: timestamp },
      userId:    { S: userId },
      message:   { S: text }
    }
  }));

  const connections = await ddb.send(new QueryCommand({
    TableName: CONNECTIONS_TABLE,
    KeyConditionExpression: "roomId = :r",
    ExpressionAttributeValues: { ":r": { S: roomId } }
  }));

  const mgmt = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`
  });

  const payload = Buffer.from(JSON.stringify({
    roomId, userId, message: text, timestamp
  }));

  await Promise.all((connections.Items || []).map(async (item) => {
    const connId = item.connectionId.S!;
    try {
      await mgmt.send(new PostToConnectionCommand({ ConnectionId: connId, Data: payload }));
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 410) {
        await ddb.send(new DeleteItemCommand({
          TableName: CONNECTIONS_TABLE,
          Key: { roomId: { S: roomId }, connectionId: { S: connId } }
        }));
      }
    }
  }));

  await mgmt.send(new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: Buffer.from(JSON.stringify({ ack: true, timestamp }))
  }));

  return { statusCode: 200 };
};
```

Build three zip files: `connect.zip`, `disconnect.zip`, `message.zip`.

## Optional authentication

Start without auth to validate the flow.

* Add a **JWT authorizer** in API Gateway v2. Accept tokens from Cognito or your IdP.
* Use claims to set `userId` and allowed `roomId` in `$context.authorizer`.
* Enforce per-room access in the Lambdas by checking claims.

## Client integration

A minimal browser client with reconnection and heartbeats.

```html
<script>
  const endpoint = "wss://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com";
  let ws, pingTimer, reconnectTimer;

  function connect(roomId = "lobby", userId = "web-" + Math.random().toString(36).slice(2)) {
    ws = new WebSocket(`${endpoint}/?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`);

    ws.onopen = () => {
      console.log("connected");
      clearInterval(reconnectTimer);
      pingTimer = setInterval(() => ws.send(JSON.stringify({ action: "ping" })), 25000);
    };

    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      renderMessage(data);
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      reconnectTimer = setInterval(() => connect(roomId, userId), 3000);
    };

    ws.onerror = () => ws.close();
  }

  function sendMessage(message, roomId = "lobby", userId = "web") {
    ws.send(JSON.stringify({ action: "sendMessage", roomId, userId, message }));
  }

  function renderMessage({ userId, message, timestamp }) {
    const el = document.getElementById("chat");
    const li = document.createElement("li");
    li.textContent = `[${timestamp}] ${userId}: ${message}`;
    el.appendChild(li);
  }

  connect();
</script>
<ul id="chat"></ul>
<input id="msg" />
<button onclick="sendMessage(document.getElementById('msg').value)">Send</button>
```

## Operations and reliability

* **Metrics and alarms**

  * API Gateway 4XX and 5XX rates
  * Lambda errors, duration, and throttles
  * DynamoDB throttles
* **DLQs**

  * Configure SQS DLQs for all three Lambdas and alarm on non-zero depth.
* **Stale connection cleanup**

  * Remove connections on 410 Gone as shown.
  * TTL on `chat_connections` ensures eventual cleanup.
* **Throughput**

  * Use batches per room and parallelize `PostToConnection`. Fan-out is limited by API Gateway TPS and Lambda concurrency. Add backoff and chunking for very large rooms.
* **History and retention**

  * Set DynamoDB TTL on `chat_messages` if you do not need long-term storage.
  * For longer retention, ship messages to S3 via Firehose from Lambda.
* **Cost awareness**

  * WebSocket connections cost per million minutes. Idle clients still count. Use heartbeats and close idle clients on the server if needed.

## Deployment checklist

* [ ] `terraform apply` outputs the `wss://` endpoint
* [ ] Basic client connects, sends, and receives messages in the lobby
* [ ] Alarms on 5XX and Lambda errors are green
* [ ] DLQs are attached and empty
* [ ] TTL is enabled on `chat_connections` and, if desired, `chat_messages`

## Next steps

* Add JWT authorizer and role-based room access.
* Introduce message moderation and rate limits per user.
* Add a simple REST `GET /history` to fetch the last N messages for a room.
* Optionally put a CloudFront distribution in front of the WebSocket API for a custom domain and TLS cert management.

This plan gets a functional, production-shaped chat service online without managing servers. From here, iterate on auth, moderation, and UX as needs grow.
