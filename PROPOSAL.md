# Proposal

## From a Monolith to Microservices & Microservice Communication Observation with OpenTelemetry & Jaeger

### Project Definition

This project should transform a monolithic messaging application into a microservices-based architecture. The system will use WebSockets for real-time updates, a message broker (RabbitMQ) for communication between microservices and OpenTelemetry with Jaeger for monitoring.

**Microservices:**

-    **Authentication Service**: Handles user login, registration, and JWT-based authentication
-    **Friendship Management Service**: Manages friend requests, relationships, and notifications
-    **Messaging Service**: Handles text messaging functionalities, including sending, storing, and retrieving messages
-    **Notification Service**: Subscribes to the message broker for event updates and sends notifications to WebSocket-connected clients in real-time
-    **Static Resource Provider**: Provides HTML, CSS, js and images

**OpenTelemetry and Jaeger:**

OpenTelemetry: OpenTelemetry is an open-source framework for collecting, processing, and exporting telemetry data like traces, metrics, and logs from applications. It provides libraries and tools to monitor code and send this data to backends.
We can do this by using a self hosted OpenTelemetry Collector and send the telemetry data from our microservices.

Jaeger: Jaeger is a tracing system used to visualize traces collected from distributed systems. It works by collecting trace data (in our case from OpenTelemetry) and storing it for analysis.

By using OpenTelemetry and Jaeger together, we want to:

-    **Monitor how the services interact**: We can see how the different parts of the system talk to each other and if there are any issues
-    **Understand the flow of requests**: When a user sends a request, we can follow it step by step through the system to find where something might be slowing down or going wrong
-    **Measure key processes**: For example, we want to know how long it takes for a user to log in, send a message, or handle a friend request

### Implementation

#### Milestones

**Service Design and Setup**

-    Define APIs for each service
-    Set up Docker for containerized development
-    Design WebSocket manager for real-time updates

**Build Core Microservices**

-    Implement core functionalities for Authentication, Friendship Management, and Messaging Services
-    Develop WebSocket communication in the Notification Service

**Deploy in Google Cloud**

-    Deploy Kubernetes Cluster using Google Kubernetes Engine
-    Use Google Cloud Load Balancer to route to microservices

### Responsibilities

**David Weinstabl: Authentication and Deployment**

-    Design and implement the Authentication Service and Static Resource Provider
-    Design and implement Notification Service
-    Integrate OpenTelemetry instrumentation for this service

**Sarah Dreiblmeier: Friendship Management and Observability**

-    Design and implement the Friendship Management Service
-    Set up Jaeger for trace visualization
-    Integrate OpenTelemetry instrumentation for this service

**Paula Schachinger: Messaging, WebSockets, and Notifications**

-    Design and implement the Messaging Service
-    Integrate OpenTelemetry instrumentation for this service

## Concept

![alt text](Architecture_Overview.png)
