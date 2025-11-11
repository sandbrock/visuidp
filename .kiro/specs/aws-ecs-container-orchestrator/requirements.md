# Requirements Document

## Introduction

The AWS Managed Container Orchestrator feature currently displays Kubernetes (EKS) properties when AWS is selected as the cloud provider. However, AWS's native managed container orchestration service is ECS (Elastic Container Service), not EKS. This feature corrects the property schemas to display ECS cluster configuration options instead of Kubernetes properties. The Container Orchestrator blueprint resource represents an ECS cluster only - task definitions and services will be configured at the stack level, not the blueprint level.

## Glossary

- **ECS**: Amazon Elastic Container Service, AWS's native container orchestration platform
- **EKS**: Amazon Elastic Kubernetes Service, AWS's managed Kubernetes service
- **Fargate**: AWS serverless compute engine for containers that works with ECS
- **EC2 Launch Type**: ECS deployment mode where containers run on EC2 instances managed by the user
- **Task Definition**: Blueprint for ECS applications that specifies container configurations
- **Service**: ECS construct that maintains a specified number of running task instances
- **Property Schema**: A database record that defines a configurable property for a specific Resource Type and Cloud Provider combination
- **Resource Type Cloud Mapping**: A database record that links a Resource Type to a Cloud Provider and specifies the Terraform module location
- **IDP System**: The Internal Developer Platform application that manages stacks and blueprints
- **Terraform Module**: Infrastructure-as-code module that provisions cloud resources

## Requirements

### Requirement 1

**User Story:** As a developer, I want AWS Managed Container Orchestrator to display ECS properties instead of Kubernetes properties, so that I can configure AWS-native container orchestration

#### Acceptance Criteria

1. WHEN a developer selects Managed Container Orchestrator resource type with AWS cloud provider, THE IDP System SHALL display property schemas for AWS ECS configuration
2. THE IDP System SHALL NOT display Kubernetes-specific properties for AWS Managed Container Orchestrator
3. THE IDP System SHALL display ECS-specific properties including launch type, task CPU, task memory, and desired task count
4. THE IDP System SHALL maintain backward compatibility by preserving existing property schema records with different identifiers

### Requirement 2

**User Story:** As a developer, I want to specify the ECS launch type, so that I can choose between Fargate and EC2 deployment modes

#### Acceptance Criteria

1. THE IDP System SHALL provide a launch type property with allowed values (FARGATE, EC2)
2. THE IDP System SHALL set FARGATE as the default value for launch type
3. THE IDP System SHALL mark launch type as a required property
4. THE IDP System SHALL display launch type as the first property with display order 10

### Requirement 3

**User Story:** As a developer, I want to specify task CPU and memory, so that I can allocate appropriate compute resources for my containers

#### Acceptance Criteria

1. THE IDP System SHALL provide a task CPU property with allowed values (256, 512, 1024, 2048, 4096)
2. THE IDP System SHALL provide a task memory property with allowed values (512, 1024, 2048, 4096, 8192, 16384, 30720)
3. THE IDP System SHALL set 512 as the default value for task CPU
4. THE IDP System SHALL set 1024 as the default value for task memory
5. THE IDP System SHALL mark both task CPU and task memory as required properties
6. THE IDP System SHALL provide descriptions that specify units (CPU units for task CPU, MiB for task memory)

### Requirement 4

**User Story:** As a developer, I want to specify the desired task count, so that I can control how many container instances run simultaneously

#### Acceptance Criteria

1. THE IDP System SHALL provide a desired task count property as a number
2. THE IDP System SHALL set minimum value of 1 for desired task count
3. THE IDP System SHALL set maximum value of 100 for desired task count
4. THE IDP System SHALL set 2 as the default value for desired task count
5. THE IDP System SHALL mark desired task count as a required property

### Requirement 5

**User Story:** As a developer, I want to enable auto-scaling for my ECS service, so that it can automatically adjust capacity based on demand

#### Acceptance Criteria

1. THE IDP System SHALL provide an enable auto-scaling property as a boolean
2. THE IDP System SHALL set false as the default value for enable auto-scaling
3. THE IDP System SHALL mark enable auto-scaling as an optional property
4. THE IDP System SHALL provide a description explaining that auto-scaling adjusts task count based on CloudWatch metrics

### Requirement 6

**User Story:** As a developer, I want to configure auto-scaling thresholds, so that I can control when scaling occurs

#### Acceptance Criteria

1. WHEN enable auto-scaling is true, THE IDP System SHALL provide a minimum task count property as a number
2. WHEN enable auto-scaling is true, THE IDP System SHALL provide a maximum task count property as a number
3. THE IDP System SHALL set minimum value of 1 for minimum task count
4. THE IDP System SHALL set maximum value of 100 for maximum task count
5. THE IDP System SHALL set 1 as the default value for minimum task count
6. THE IDP System SHALL set 10 as the default value for maximum task count
7. THE IDP System SHALL mark both properties as optional

### Requirement 7

**User Story:** As a developer, I want to specify EC2 instance type when using EC2 launch type, so that I can control the underlying compute infrastructure

#### Acceptance Criteria

1. WHEN launch type is EC2, THE IDP System SHALL provide an instance type property with allowed values (t3.small, t3.medium, t3.large, t3.xlarge, m5.large, m5.xlarge, m5.2xlarge, c5.large, c5.xlarge, c5.2xlarge)
2. THE IDP System SHALL set t3.medium as the default value for instance type
3. THE IDP System SHALL mark instance type as an optional property
4. THE IDP System SHALL provide a description indicating this property only applies to EC2 launch type

### Requirement 8

**User Story:** As a database administrator, I want the ECS property schemas to be added through a database migration, so that they are consistently applied across all environments

#### Acceptance Criteria

1. THE IDP System SHALL create a new Flyway migration script to add ECS property schemas
2. THE IDP System SHALL use simple, sequential UUIDs for new property schema records
3. THE IDP System SHALL use ON CONFLICT clauses to prevent duplicate insertions
4. THE IDP System SHALL order property schemas by display_order to ensure consistent form rendering
5. THE IDP System SHALL NOT delete existing Kubernetes property schemas to maintain backward compatibility

### Requirement 9

**User Story:** As a developer, I want the Terraform module location to point to an ECS module, so that the system provisions ECS resources correctly

#### Acceptance Criteria

1. THE IDP System SHALL update the resource type cloud mapping for AWS Managed Container Orchestrator to use the terraform-aws-ecs module
2. THE IDP System SHALL use the URL https://github.com/terraform-aws-modules/terraform-aws-ecs as the module location
3. THE IDP System SHALL maintain GIT as the module location type
4. THE IDP System SHALL keep the mapping enabled

### Requirement 10

**User Story:** As a developer, I want property descriptions to be clear and helpful, so that I understand ECS configuration options without consulting external documentation

#### Acceptance Criteria

1. WHEN a property schema is displayed, THE IDP System SHALL show a description that explains the property's purpose in ECS context
2. THE IDP System SHALL provide descriptions that reference ECS-specific terminology
3. THE IDP System SHALL provide descriptions that include valid value ranges for numeric properties
4. THE IDP System SHALL provide descriptions that explain the relationship between CPU and memory configurations

### Requirement 11

**User Story:** As a developer, I want validation rules to prevent invalid ECS configurations, so that I receive immediate feedback on incorrect inputs

#### Acceptance Criteria

1. WHEN a property has minimum and maximum constraints, THE IDP System SHALL validate numeric inputs against those constraints
2. WHEN a property has allowed values, THE IDP System SHALL restrict input to only those values
3. WHEN a property is marked as required, THE IDP System SHALL prevent form submission if the property is not provided
4. THE IDP System SHALL display validation error messages that reference the specific constraint violated

### Requirement 12

**User Story:** As a developer, I want property display order to be logical, so that the most important ECS properties appear first in the form

#### Acceptance Criteria

1. THE IDP System SHALL order properties with launch type appearing first
2. THE IDP System SHALL order properties with task CPU and memory appearing before scaling properties
3. THE IDP System SHALL order properties with required fields appearing before optional fields
4. THE IDP System SHALL use display_order values with gaps (10, 20, 30) to allow future insertions

### Requirement 13

**User Story:** As a system administrator, I want the migration to handle existing data gracefully, so that it doesn't fail if property schemas already exist

#### Acceptance Criteria

1. THE IDP System SHALL use ON CONFLICT DO UPDATE clauses for the resource type cloud mapping update
2. THE IDP System SHALL use ON CONFLICT DO NOTHING clauses for property schema insertions
3. THE IDP System SHALL preserve any existing property schemas that don't conflict with new ECS schemas
4. THE IDP System SHALL document in the migration script that this replaces Kubernetes properties with ECS properties

### Requirement 14

**User Story:** As a developer, I want sensible default values for ECS properties, so that I can quickly configure services with recommended settings

#### Acceptance Criteria

1. THE IDP System SHALL provide default values that follow AWS ECS best practices
2. THE IDP System SHALL default to Fargate launch type for serverless deployment
3. THE IDP System SHALL default to minimal but functional CPU and memory allocations
4. THE IDP System SHALL default to 2 tasks for basic high availability
5. THE IDP System SHALL allow developers to override all default values
