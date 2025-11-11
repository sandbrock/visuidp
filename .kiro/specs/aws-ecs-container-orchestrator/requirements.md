# Requirements Document

## Introduction

The AWS Managed Container Orchestrator feature currently displays Kubernetes (EKS) properties when AWS is selected as the cloud provider. However, AWS's native managed container orchestration service is ECS (Elastic Container Service), not EKS. This feature corrects the property schemas to display ECS cluster configuration options instead of Kubernetes properties. The Container Orchestrator blueprint resource represents an ECS cluster only - task definitions and services will be configured at the stack level, not the blueprint level.

## Glossary

- **ECS**: Amazon Elastic Container Service, AWS's native container orchestration platform
- **ECS Cluster**: A logical grouping of ECS tasks and services that provides the infrastructure for running containers
- **EKS**: Amazon Elastic Kubernetes Service, AWS's managed Kubernetes service
- **Fargate**: AWS serverless compute engine for containers that works with ECS
- **EC2 Launch Type**: ECS deployment mode where containers run on EC2 instances managed by the user
- **Task Definition**: Blueprint for ECS applications that specifies container configurations (configured at stack level, not blueprint level)
- **Service**: ECS construct that maintains a specified number of running task instances (configured at stack level, not blueprint level)
- **Blueprint**: A reusable infrastructure template that defines shared resources like ECS clusters
- **Stack**: A deployed instance of an application that references blueprint resources and defines application-specific configuration like tasks
- **Property Schema**: A database record that defines a configurable property for a specific Resource Type and Cloud Provider combination
- **Resource Type Cloud Mapping**: A database record that links a Resource Type to a Cloud Provider and specifies the Terraform module location
- **IDP System**: The Internal Developer Platform application that manages stacks and blueprints
- **Terraform Module**: Infrastructure-as-code module that provisions cloud resources

## Requirements

### Requirement 1

**User Story:** As a developer, I want AWS Managed Container Orchestrator to display ECS cluster properties instead of Kubernetes properties, so that I can configure AWS-native container orchestration infrastructure

#### Acceptance Criteria

1. WHEN a developer selects Managed Container Orchestrator resource type with AWS cloud provider, THE IDP System SHALL display property schemas for AWS ECS cluster configuration
2. THE IDP System SHALL NOT display Kubernetes-specific properties for AWS Managed Container Orchestrator
3. THE IDP System SHALL display ECS cluster-level properties only, excluding task-specific properties
4. THE IDP System SHALL maintain backward compatibility by preserving existing property schema records with different identifiers

### Requirement 2

**User Story:** As a developer, I want to specify the ECS cluster capacity provider strategy, so that I can choose between Fargate and EC2 infrastructure for my cluster

#### Acceptance Criteria

1. THE IDP System SHALL provide a capacity provider property with allowed values (FARGATE, FARGATE_SPOT, EC2)
2. THE IDP System SHALL set FARGATE as the default value for capacity provider
3. THE IDP System SHALL mark capacity provider as a required property
4. THE IDP System SHALL display capacity provider as the first property with display order 10

### Requirement 3

**User Story:** As a developer, I want to specify EC2 instance type when using EC2 capacity provider, so that I can control the underlying compute infrastructure for my cluster

#### Acceptance Criteria

1. WHEN capacity provider is EC2, THE IDP System SHALL provide an instance type property with allowed values (t3.small, t3.medium, t3.large, t3.xlarge, m5.large, m5.xlarge, m5.2xlarge, c5.large, c5.xlarge, c5.2xlarge)
2. THE IDP System SHALL set t3.medium as the default value for instance type
3. THE IDP System SHALL mark instance type as an optional property
4. THE IDP System SHALL provide a description indicating this property only applies to EC2 capacity provider
5. THE IDP System SHALL display instance type with display order 20

### Requirement 4

**User Story:** As a developer, I want to specify the minimum cluster size for EC2 capacity provider, so that I can ensure baseline capacity for my cluster

#### Acceptance Criteria

1. WHEN capacity provider is EC2, THE IDP System SHALL provide a minimum cluster size property as a number
2. THE IDP System SHALL set minimum value of 0 for minimum cluster size
3. THE IDP System SHALL set maximum value of 100 for minimum cluster size
4. THE IDP System SHALL set 1 as the default value for minimum cluster size
5. THE IDP System SHALL mark minimum cluster size as an optional property
6. THE IDP System SHALL provide a description indicating this property only applies to EC2 capacity provider
7. THE IDP System SHALL display minimum cluster size with display order 30

### Requirement 5

**User Story:** As a developer, I want to specify the maximum cluster size for EC2 capacity provider, so that I can control cost and resource limits for my cluster

#### Acceptance Criteria

1. WHEN capacity provider is EC2, THE IDP System SHALL provide a maximum cluster size property as a number
2. THE IDP System SHALL set minimum value of 1 for maximum cluster size
3. THE IDP System SHALL set maximum value of 100 for maximum cluster size
4. THE IDP System SHALL set 10 as the default value for maximum cluster size
5. THE IDP System SHALL mark maximum cluster size as an optional property
6. THE IDP System SHALL provide a description indicating this property only applies to EC2 capacity provider
7. THE IDP System SHALL display maximum cluster size with display order 40

### Requirement 6

**User Story:** As a developer, I want to enable container insights for my ECS cluster, so that I can monitor cluster and task-level metrics

#### Acceptance Criteria

1. THE IDP System SHALL provide an enable container insights property as a boolean
2. THE IDP System SHALL set true as the default value for enable container insights
3. THE IDP System SHALL mark enable container insights as an optional property
4. THE IDP System SHALL provide a description explaining that container insights provides enhanced monitoring via CloudWatch
5. THE IDP System SHALL display enable container insights with display order 50

### Requirement 7

**User Story:** As a database administrator, I want the ECS cluster property schemas to be added through a database migration, so that they are consistently applied across all environments

#### Acceptance Criteria

1. THE IDP System SHALL create a new Flyway migration script to add ECS cluster property schemas
2. THE IDP System SHALL use simple, sequential UUIDs for new property schema records
3. THE IDP System SHALL use ON CONFLICT clauses to prevent duplicate insertions
4. THE IDP System SHALL order property schemas by display_order to ensure consistent form rendering
5. THE IDP System SHALL NOT delete existing Kubernetes property schemas to maintain backward compatibility
6. THE IDP System SHALL include only cluster-level properties, excluding task-level properties

### Requirement 8

**User Story:** As a developer, I want the Terraform module location to point to an ECS cluster module, so that the system provisions ECS cluster resources correctly

#### Acceptance Criteria

1. THE IDP System SHALL update the resource type cloud mapping for AWS Managed Container Orchestrator to use the terraform-aws-ecs module
2. THE IDP System SHALL use the URL https://github.com/terraform-aws-modules/terraform-aws-ecs as the module location
3. THE IDP System SHALL maintain GIT as the module location type
4. THE IDP System SHALL keep the mapping enabled
5. THE IDP System SHALL configure the module to provision ECS clusters only, not task definitions or services

### Requirement 9

**User Story:** As a developer, I want property descriptions to be clear and helpful, so that I understand ECS cluster configuration options without consulting external documentation

#### Acceptance Criteria

1. WHEN a property schema is displayed, THE IDP System SHALL show a description that explains the property's purpose in ECS cluster context
2. THE IDP System SHALL provide descriptions that reference ECS cluster-specific terminology
3. THE IDP System SHALL provide descriptions that include valid value ranges for numeric properties
4. THE IDP System SHALL provide descriptions that clarify which properties apply to which capacity providers

### Requirement 10

**User Story:** As a developer, I want validation rules to prevent invalid ECS cluster configurations, so that I receive immediate feedback on incorrect inputs

#### Acceptance Criteria

1. WHEN a property has minimum and maximum constraints, THE IDP System SHALL validate numeric inputs against those constraints
2. WHEN a property has allowed values, THE IDP System SHALL restrict input to only those values
3. WHEN a property is marked as required, THE IDP System SHALL prevent form submission if the property is not provided
4. THE IDP System SHALL display validation error messages that reference the specific constraint violated
5. THE IDP System SHALL validate that maximum cluster size is greater than or equal to minimum cluster size

### Requirement 11

**User Story:** As a developer, I want property display order to be logical, so that the most important ECS cluster properties appear first in the form

#### Acceptance Criteria

1. THE IDP System SHALL order properties with capacity provider appearing first
2. THE IDP System SHALL order properties with EC2-specific configuration appearing after capacity provider
3. THE IDP System SHALL order properties with required fields appearing before optional fields
4. THE IDP System SHALL use display_order values with gaps (10, 20, 30) to allow future insertions

### Requirement 12

**User Story:** As a system administrator, I want the migration to handle existing data gracefully, so that it doesn't fail if property schemas already exist

#### Acceptance Criteria

1. THE IDP System SHALL use ON CONFLICT DO UPDATE clauses for the resource type cloud mapping update
2. THE IDP System SHALL use ON CONFLICT DO NOTHING clauses for property schema insertions
3. THE IDP System SHALL preserve any existing property schemas that don't conflict with new ECS cluster schemas
4. THE IDP System SHALL document in the migration script that this replaces Kubernetes properties with ECS cluster properties

### Requirement 13

**User Story:** As a developer, I want sensible default values for ECS cluster properties, so that I can quickly configure clusters with recommended settings

#### Acceptance Criteria

1. THE IDP System SHALL provide default values that follow AWS ECS best practices
2. THE IDP System SHALL default to Fargate capacity provider for serverless deployment
3. THE IDP System SHALL default to container insights enabled for better observability
4. THE IDP System SHALL default to reasonable EC2 cluster size limits when EC2 capacity provider is selected
5. THE IDP System SHALL allow developers to override all default values
