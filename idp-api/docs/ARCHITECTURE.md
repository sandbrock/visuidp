# Overview
This project is a RESTful API using the latest stable version of Quarkus. It will be used as the main API for an Internal Developer Platform. The main goal is to provide a provisioning process that is responsible for creating and managing developer projects.

# Architecture
Use Clean Architecture principles. Ensure the code can easily be extended or altered without affecting the core business logic.

## Repository Pattern

The application uses the Repository pattern to abstract data persistence. This allows the system to support multiple database backends (PostgreSQL and DynamoDB) without changing business logic.

**Key Components:**
- **Repository Interfaces**: Define data access contracts in the domain layer
- **Repository Implementations**: Provide database-specific implementations in the infrastructure layer
- **Dependency Injection**: CDI automatically injects the correct implementation based on configuration

**Benefits:**
- Database-agnostic business logic
- Easy testing with mocked repositories
- Configuration-driven database selection
- No code changes required to switch databases

For complete details, see:
- [Database Architecture Documentation](DATABASE_ARCHITECTURE.md) - Comprehensive architecture guide
- [Database Architecture Diagrams](DATABASE_ARCHITECTURE_DIAGRAMS.md) - Visual representations
- [Database Quick Reference](DATABASE_QUICK_REFERENCE.md) - Developer quick start guide

# Security
It will use AWS IAM Identity Center with SSO for authenticating and authorizing members of my organization to login.

# Data Structure
The IDP API supports multiple database backends through a pluggable architecture. Installers can choose between PostgreSQL (relational) and DynamoDB (NoSQL) based on their infrastructure requirements.

Store data using both structured schema and flexible JSON/Map data structures. Use structured schema where the data model is well-known. Use JSON/Map structures where the schema is not well-known or is likely to change.

For detailed information about the database architecture, repository pattern implementation, and database provider selection mechanism, see [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md).

## Compute
Compute resources will automatically be provisioned by the IDP. Developers do not need to request it specifically. Though they will include configuration files in their repositories that will be used to configure initial sizing and autoscaling.

## Stack
The core of the system will be the "stack." A stack is a developer project that represents a single service or UI application with its dependent infrastructure resources. Stacks are cloud-agnostic by design - they do not have a direct association with a cloud provider. Instead, cloud provider selection happens at the environment level, allowing the same stack definition to be deployed across multiple cloud providers (AWS, Azure, GCP, on-premises) through different environments. This design principle ensures true portability and flexibility in infrastructure management.

There are different types of stacks.

### Stack Types
- Infrastructure - This type of stack only contains infrastructure resources such as databases, queues, and caches. It does not contain any application code.
- RESTful Serverless - When running on-premises, this will run as a pod in a baremetal Kubernetes cluster. When running in AWS, this will run as a Lambda function. This type of stack contains infrastructure resources and application code. This can be public or private. Developers can pick a language for their application code. The default will be Quarkus. The other option will be node.js. Other languages may be introduced in the future.
- RESTful API - When running on-premises, this will run as a pod in a baremetal Kubernetes cluster. When running in AWS, this will run as a pod in ECS Fargate. This type of stack contains infrastructure resources and application code. This can be public or private. Developers can pick a language for their application code. The default will be Quarkus. The other option will be node.js. Other languages may be introduced in the future.
- JavaScript Web Application - This type of stack contains an application built with a front-end framework, which will be integrated with node.js. The primary framework will be React. Other frameworks may be introduced in the future.
- Event-driven Serverless - When running on-premises, this will run as a pod in a baremetal kubernetes cluster. When running in AWS, this will run as a Lambda function. The primary way of triggering this type of stack through an event. On-premises, it will be connected to RabbitMQ. In AWS, it will be connected to a service bus or SQS queue. It may expose an internal API for health checks and testing. Developers can pick a language for their application code. The default will be Quarkus. The other option will be node.js. Other languages may be introduced in the future.
- Event-driven API - When running on-premises, this will run as a pod in a baremetal Kubernetes cluster. When running in AWS, this will run as a pod in ECS Fargate. This type of stack is primarily triggered through events but also exposes an API for synchronous operations. On-premises, it will be connected to RabbitMQ for events. In AWS, it will be connected to SQS/SNS or EventBridge for events. This stack type combines event processing with API capabilities. Developers can pick a language for their application code. The default will be Quarkus. The other option will be node.js. Other languages may be introduced in the future.

# Infrastructure
This service will introduce an abstraction layer between infrastructure resources and the developer. It will automatically create the resources based on the target environment. Below is a list of resource types that developers can create. For each type of resource, its configuration should be persisted in a JSON document, since the schema will differ for each type of resource.

## Resource Types
- PostgreSQL Database - For on-premises, this will be a PostgreSQL database. For AWS, this will be an Aurora PostgreSQL database.
- Cache - For on-premises, this will be a Redis cache. For AWS, this will be an ElastiCache Redis cache.
- Queue - For on-premises, this will be a RabbitMQ queue. For AWS, this will be an SQS queue.

## Resource Provisioners
A resource provisioner is a plugin type that is responsible for creating a resource. For an on-premises relational database, the provisioner will create a PostgreSQL database on an existing database server. For AWS, it will create dynamic Terraform code that will create an Aurora PostgreSQL database.

# Compute
There will be three types of compute resources. On-premises will use baremetal Kubernetes. AWS will use Lambda and ECS Fargate.

## Compute Provisioner
A compute provisioner is a plugin type that is responsible for creating compute resources. 

For on-premises, it will dynamically create Kubernetes manifests. It needs to associate the compute resource with a namespace. It needs to create the namespace if it does not exist.

For AWS, it will create dynamic Terraform code that will create a Lambda function or ECS Fargate task. For Fargate, it needs to know what cluster to deploy the pod to. It should create the ECS cluster if it does not exist.

# Environment Progression
The provisioner will start by provisioning resources in the dev environment. Once the developer is ready, they can promote the resources to the next environment. This will create a new set of resources in the next environment. The developer can then promote the resources to the next environment, and so on.

Each environment is associated with a specific cloud provider, which determines where the stack's resources will be provisioned. This environment-level cloud provider association enables the same stack to be deployed to different cloud providers in different environments, supporting hybrid and multi-cloud deployment strategies.

# Idempotent
All aspects of the provisioning process should be idempotent. This means that running the process multiple times should produce the same result. This is important for when new features are added to the IDP. The developers can re-run the stack provisioning process to apply the new features to their stack.

# Use Cases
- Developer creates a new stack. During this process, they must choose the stack type. For a RESTful API, they must choose whether to make it public or private. They must also choose the language.
- Developers updates an existing stack. The developer chooses a stack and runs the provisioning process again. This will update the stack with any changes to the configuration.
- Developer promotes a stack to the next environment. This will create a new set of resources in the next environment.

# Security Model
- AWS security model - Resources must be associated with a role. IDP will create the role and manage the role permissions, allowing compute resources to access infrastructure resources.

# Ephemeral Environments
- Developers can define an ephemeral environment. It will consist of one or more stacks. For on-premises, all resources in the ephemeral environment will be deployed to a unique namesspace. For AWS, all resources will be deployed to a unique ECS cluster, or uniquely named lambda functions.
- Each ephemeral environment contains a unique prefix. For on-premises, this will be the namespace prefix. For AWS, this will be the ECS cluster prefix or the lambda function prefix.
