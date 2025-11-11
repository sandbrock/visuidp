# Requirements Document

## Introduction

The AWS Default Properties feature initializes the property_schemas table with default AWS-specific properties for all resource types. After completing the dynamic-infrastructure-forms feature, cloud resources have no available properties configured, making it impossible for developers to configure cloud-specific settings. This feature focuses exclusively on AWS properties to provide immediate value, with other cloud providers to be addressed in future iterations.

## Glossary

- **Property Schema**: A database record that defines a configurable property for a specific Resource Type and Cloud Provider combination, including data type, validation rules, and display information
- **Resource Type**: A category of infrastructure resource (e.g., Storage, Relational Database Server, Container Orchestrator, Service Bus)
- **Cloud Provider**: A cloud computing platform that can host infrastructure resources (AWS, Azure, GCP)
- **Resource Type Cloud Mapping**: A database record that links a Resource Type to a Cloud Provider and specifies the Terraform module location
- **Static Data Migration**: A Flyway database migration script that inserts initial configuration data
- **IDP System**: The Internal Developer Platform application that manages stacks and blueprints
- **Terraform Module**: Infrastructure-as-code module that provisions cloud resources
- **AWS**: Amazon Web Services cloud platform

## Requirements

### Requirement 1

**User Story:** As a developer, I want AWS Storage resources to have default properties configured, so that I can configure S3 buckets with appropriate settings

#### Acceptance Criteria

1. WHEN a developer selects Storage resource type with AWS cloud provider, THE IDP System SHALL display property schemas for AWS S3 configuration
2. THE IDP System SHALL provide a storage class property with allowed values (STANDARD, STANDARD_IA, ONEZONE_IA, GLACIER, DEEP_ARCHIVE, INTELLIGENT_TIERING)
3. THE IDP System SHALL provide a versioning property with allowed values (Enabled, Suspended, Disabled)
4. THE IDP System SHALL provide an encryption property with allowed values (AES256, aws:kms)
5. THE IDP System SHALL provide a public access block property as a boolean with default value true
6. THE IDP System SHALL mark storage class, versioning, and encryption as required properties

### Requirement 2

**User Story:** As a developer, I want AWS Relational Database Server resources to have default properties configured, so that I can configure RDS instances with appropriate settings

#### Acceptance Criteria

1. WHEN a developer selects Relational Database Server resource type with AWS cloud provider, THE IDP System SHALL display property schemas for AWS RDS configuration
2. THE IDP System SHALL provide an engine property with allowed values (mysql, postgres, mariadb, oracle-ee, oracle-se2, sqlserver-ex, sqlserver-web, sqlserver-se, sqlserver-ee)
3. THE IDP System SHALL provide an engine version property as a string
4. THE IDP System SHALL provide an instance class property with allowed values (db.t3.micro, db.t3.small, db.t3.medium, db.t3.large, db.m5.large, db.m5.xlarge, db.m5.2xlarge, db.r5.large, db.r5.xlarge)
5. THE IDP System SHALL provide an allocated storage property as a number with minimum 20 and maximum 65536
6. THE IDP System SHALL provide a multi-AZ property as a boolean with default value false
7. THE IDP System SHALL provide a backup retention period property as a number with minimum 0 and maximum 35
8. THE IDP System SHALL mark engine, engine version, instance class, and allocated storage as required properties

### Requirement 3

**User Story:** As a developer, I want AWS Managed Container Orchestrator resources to have default properties configured, so that I can configure EKS clusters with appropriate settings

#### Acceptance Criteria

1. WHEN a developer selects Managed Container Orchestrator resource type with AWS cloud provider, THE IDP System SHALL display property schemas for AWS EKS configuration
2. THE IDP System SHALL provide a Kubernetes version property with allowed values (1.28, 1.29, 1.30, 1.31)
3. THE IDP System SHALL provide a node instance type property with allowed values (t3.small, t3.medium, t3.large, t3.xlarge, m5.large, m5.xlarge, m5.2xlarge, c5.large, c5.xlarge)
4. THE IDP System SHALL provide a desired node count property as a number with minimum 1 and maximum 100
5. THE IDP System SHALL provide a minimum node count property as a number with minimum 1 and maximum 100
6. THE IDP System SHALL provide a maximum node count property as a number with minimum 1 and maximum 100
7. THE IDP System SHALL provide an enable cluster autoscaler property as a boolean with default value false
8. THE IDP System SHALL mark Kubernetes version, node instance type, and desired node count as required properties

### Requirement 4

**User Story:** As a developer, I want AWS Service Bus resources to have default properties configured, so that I can configure SNS/SQS with appropriate settings

#### Acceptance Criteria

1. WHEN a developer selects Service Bus resource type with AWS cloud provider, THE IDP System SHALL display property schemas for AWS SNS/SQS configuration
2. THE IDP System SHALL provide a service type property with allowed values (SNS, SQS, EventBridge)
3. WHEN service type is SQS, THE IDP System SHALL provide a message retention period property as a number with minimum 60 and maximum 1209600
4. WHEN service type is SQS, THE IDP System SHALL provide a visibility timeout property as a number with minimum 0 and maximum 43200
5. WHEN service type is SQS, THE IDP System SHALL provide a FIFO queue property as a boolean with default value false
6. WHEN service type is SNS, THE IDP System SHALL provide a delivery policy property as a string
7. THE IDP System SHALL mark service type as a required property

### Requirement 5

**User Story:** As a database administrator, I want the default AWS properties to be initialized through a database migration, so that they are consistently applied across all environments

#### Acceptance Criteria

1. THE IDP System SHALL extend the V2 Flyway migration script to insert property schemas for AWS resource types
2. THE IDP System SHALL ensure the migration script creates resource type cloud mappings before creating property schemas
3. THE IDP System SHALL ensure the migration script uses simple UUIDs for all records
4. THE IDP System SHALL ensure the migration script uses ON CONFLICT clauses to prevent duplicate insertions
5. THE IDP System SHALL order property schemas by display_order to ensure consistent form rendering

### Requirement 6

**User Story:** As a developer, I want property schemas to have helpful descriptions, so that I understand what each property controls without consulting external documentation

#### Acceptance Criteria

1. WHEN a property schema is displayed, THE IDP System SHALL show a description that explains the property's purpose
2. THE IDP System SHALL provide descriptions that reference AWS-specific terminology where appropriate
3. THE IDP System SHALL provide descriptions that include valid value ranges for numeric properties
4. THE IDP System SHALL provide descriptions that explain the impact of boolean properties

### Requirement 7

**User Story:** As a developer, I want property schemas to have sensible default values, so that I can quickly configure resources with recommended settings

#### Acceptance Criteria

1. WHEN a property has a default value defined, THE IDP System SHALL pre-populate the form field with that value
2. THE IDP System SHALL provide default values that follow AWS best practices
3. THE IDP System SHALL provide default values for security-related properties that favor secure configurations
4. THE IDP System SHALL allow developers to override default values

### Requirement 8

**User Story:** As a developer, I want validation rules to prevent invalid configurations, so that I receive immediate feedback on incorrect inputs

#### Acceptance Criteria

1. WHEN a property has minimum and maximum constraints, THE IDP System SHALL validate numeric inputs against those constraints
2. WHEN a property has allowed values, THE IDP System SHALL restrict input to only those values
3. WHEN a property is marked as required, THE IDP System SHALL prevent form submission if the property is not provided
4. THE IDP System SHALL display validation error messages that reference the specific constraint violated

### Requirement 9

**User Story:** As a system administrator, I want the migration script to handle duplicate data gracefully, so that it doesn't fail if data already exists

#### Acceptance Criteria

1. THE IDP System SHALL use ON CONFLICT DO NOTHING clauses for all INSERT statements in the migration script
2. THE IDP System SHALL use simple, readable UUIDs for new records
3. THE IDP System SHALL reference existing resource types and cloud providers from earlier in the V2 migration
4. THE IDP System SHALL handle cases where mappings or property schemas already exist

### Requirement 10

**User Story:** As a developer, I want Terraform module locations to be specified for each AWS resource type, so that the system knows which modules to use for provisioning

#### Acceptance Criteria

1. THE IDP System SHALL create resource type cloud mappings with Terraform module locations for each AWS resource type
2. THE IDP System SHALL use GIT as the module location type for all AWS resource types
3. THE IDP System SHALL specify module locations that point to valid Terraform module repositories
4. THE IDP System SHALL mark all AWS resource type cloud mappings as enabled

### Requirement 11

**User Story:** As a developer, I want property display order to be logical, so that the most important properties appear first in the form

#### Acceptance Criteria

1. THE IDP System SHALL order properties with required fields appearing before optional fields
2. THE IDP System SHALL order properties with commonly configured settings appearing before advanced settings
3. THE IDP System SHALL use display_order values with gaps (10, 20, 30) to allow future insertions
4. THE IDP System SHALL ensure display_order is consistent across all resource types

### Requirement 12

**User Story:** As a developer, I want the migration to only initialize AWS properties, so that the system remains focused and maintainable

#### Acceptance Criteria

1. THE IDP System SHALL create property schemas only for AWS cloud provider
2. THE IDP System SHALL NOT create property schemas for Azure or GCP in this migration
3. THE IDP System SHALL document in the migration script that other cloud providers will be addressed in future updates
4. THE IDP System SHALL clearly separate AWS property data from other seed data with section comments
