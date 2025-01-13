#  TextChat

## Overview
This project should transform a monolithic messaging application into a microservices-based architecture. The system will use WebSockets for real-time updates, a message broker (RabbitMQ) for communication between microservices and OpenTelemetry with Jaeger for monitoring.

**Languages:**
- JavaScript
- HTML
- CSS

**Microservices:**

- **Authentication Service**: Handles user login, registration and JWT-based authentication
- **Friendship Management Service**: Manages friend requests, relationships and notifications
- **Messaging Service**: Handles text messaging functionalities, including sending, storing and retrieving messages
- **Notification Service**: Subscribes to the message broker for event updates and sends notifications to WebSocket-connected clients in real-time
- **Static Resource Provider**: Provides HTML, CSS, JavaScript and images

**Architecture**
![Architecture Overview](Architecture_Overview.png)

## Summary of Research

**OpenTelemetry & Jaeger:**

- OpenTelemetry = open-source observability framework
    - https://opentelemetry.io/docs/
    - Used to collect, process and export telemetry data
- Jaeger = open-source distributed tracing system
    - https://www.jaegertracing.io/docs/2.2/
    - Used to monitor and troubleshoot microservices

- Flow: 
    - Microservice instrumentation (OpenTelemetry SDKs) 
    - Events → OTLP protocol → Jaeger collector 
    - Jaeger UI → Explore spans, latencies 

**Kubernetes:**
- *Deployments for each microservice:*
    - Number of replicas
    - Docker image
    - Container ports
    - Environmental variables from (Kubernetes) Secrets

- *Services for each microservice:*
    - Mapping between:
        - container port and 
        - service port
    - Type: ClusterIP

- Ingress = used to route HTTP requests to the correct microservice
    - /websockets → NotificationService
    - /user 	 → AuthenticationService
    - /friends 	 → FriendshipService
    - /messages  → MessagingService
    - / 		 → ResourceProvider

- Ingress uses Google LoadBalancer

## Tutorial

1. Prerequisites
    - Install Google Cloud SDK
    - Install Kubernetes 
    - Install kubectl: CLI tool for managing Kubernetes
    - Install Helm: Package manager for Kubernetes
    - Install Docker

2. Clone this repository
3. Create Cluster
    ```
    gcloud container clusters create textchat-0 \
    --zone us-central1-c \
    --num-nodes 3

    gcloud container clusters get-credentials textchat-0 --zone us-central1-c
4. Build docker images
    - Replace $ with version number
    ```
    cd MicroServices
    cd ResourceProvider
    docker build -t gcr.io/textchat-0/resource-provider:v$ .
    docker push gcr.io/textchat-0/resource-provider:v$ 

    cd ..
    cd FriendshipService
    docker build -t gcr.io/textchat-0/friendship-service:v$ .
    docker push gcr.io/textchat-0/friendship-service:v$ 

    cd ..
    cd NotificationService
    docker build -t gcr.io/textchat-0/notification-service:v$ .
    docker push gcr.io/textchat-0/notification-service:v$ 

    cd ..
    cd AuthenticationService
    docker build -t gcr.io/textchat-0/authentication-service:v$ .
    docker push gcr.io/textchat-0/authentication-service:v$ 

    cd ..
    cd MessagingService
    docker build -t gcr.io/textchat-0/messaging-service:v$ .
    docker push gcr.io/textchat-0/messaging-service:v$ 

    cd ../..
5. Install RabbitMQ
    - Replace rabbitmq-secret.yaml with rabbitmq-credentials
    ```
    kubectl apply -f Kubernetes/rabbitmq-secret.yaml

    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm install rabbitmq bitnami/rabbitmq --namespace default --create-namespace

    kubectl apply -f Kubernetes/rabbitmq-deployment.yaml
    kubectl apply -f Kubernetes/rabbitmq-service.yaml
6. Deploy Microservices:
    - Adjust deployment yaml files to correct docker image version
    ```
    kubectl apply -f Kubernetes/secret.yaml

    kubectl apply -f Kubernetes/authentication-service-deployment.yaml
    kubectl apply -f Kubernetes/authentication-service-service.yaml
    kubectl apply -f Kubernetes/messaging-service-deployment.yaml
    kubectl apply -f Kubernetes/messaging-service-service.yaml
    kubectl apply -f Kubernetes/friendship-service-deployment.yaml
    kubectl apply -f Kubernetes/friendship-service-service.yaml
    kubectl apply -f Kubernetes/notification-service-deployment.yaml
    kubectl apply -f Kubernetes/notification-service-service.yaml
    kubectl apply -f Kubernetes/resource-provider-deployment.yaml
    kubectl apply -f Kubernetes/resource-provider-service.yaml
7. Deploy Jaeger
    ```
    kubectl apply -f Kubernetes/jaeger-deployment.yaml
    kubectl apply -f Kubernetes/jaeger-service.yaml

8. Deploy Ingress
    ```
    kubectl apply -f Kubernetes/ingress.yaml

## Summary of Lessons Learned

**Microservices & GKE:**

-    We used Kubernetes Deployments, Services and Ingress for scalability and maintainability
-    Answer health checks with WebServer otherwise unhealthy state

**RabbitMQ & Communication:**

-    Send messages to other microservices without being directly connected
-    Ensured robust message handling with minimal coupling between producers and consumers

**OpenTelemetry & Jaeger:**

-    Directly sending OTLP traces to Jeager without using an extra OTEL collector
-    By using automatic and manual racing → see how requests flow through system

**Configuration & Secrets:**

-    Centralized environment variables for database URLs, RabbitMQ and JWT keys
-    Secured sensitive data using Kubernetes Secrets and avoided hardcoding

**Docker:**

-    Always increase the version number in the Dockerfile when making changes → no overwriting of versions possible

**Scalability & Future-Proofing:**

-    Prepared for additional monitoring signals by understanding OpenTelemetry Collector benefits
-    Maintained consistent naming conventions (service names, routes, etc.) to simplify debugging
