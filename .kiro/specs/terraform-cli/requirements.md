# Requirements Document

## Introduction

This document defines the requirements for a Rust-based command-line interface (CLI) application that queries the IDP API and generates Terraform configurations for provisioning cloud resources. The CLI will enable developers and operators to translate IDP stack definitions into executable infrastructure-as-code, supporting multiple cloud providers and resource types.

## Glossary

- **CLI**: Command-Line Interface application built in Rust
- **IDP API**: The Internal Developer Platform RESTful API (idp-api) that manages stacks, blueprints, and resources
- **Terraform**: Infrastructure-as-code tool for provisioning cloud resources
- **Stack**: A developer project containing application code and/or infrastructure resources
- **Resource Type**: A category of infrastructure (e.g., database, cache, queue) abstracted from cloud-specific implementations
- **Cloud Provider**: A target infrastructure platform (AWS, Azure, GCP, on-premises Kubernetes)
- **API Key**: Bearer token used for authenticating programmatic access to the IDP API
- **HCL**: HashiCorp Configuration Language, the syntax used by Terraform

## Requirements

### Requirement 1

**User Story:** As a developer, I want to authenticate with the IDP API using an API key, so that I can securely access stack and resource information

#### Acceptance Criteria

1. WHEN the user provides an API key via environment variable, THE CLI SHALL authenticate all API requests using the Bearer token authentication scheme
2. WHEN the user provides an API key via command-line flag, THE CLI SHALL authenticate all API requests using the provided key
3. WHEN the user provides an API key via configuration file, THE CLI SHALL read and use the key for authentication
4. IF no API key is provided, THEN THE CLI SHALL display an error message indicating authentication is required
5. WHEN an API request returns a 401 Unauthorized status, THE CLI SHALL display an error message indicating the API key is invalid or expired

### Requirement 2

**User Story:** As a developer, I want to specify the IDP API base URL, so that I can connect to different environments (development, staging, production)

#### Acceptance Criteria

1. WHEN the user provides an API base URL via environment variable, THE CLI SHALL use that URL for all API requests
2. WHEN the user provides an API base URL via command-line flag, THE CLI SHALL use that URL for all API requests
3. WHEN the user provides an API base URL via configuration file, THE CLI SHALL use that URL for all API requests
4. WHEN no API base URL is provided, THE CLI SHALL use a default value of "http://localhost:8082/api/v1"
5. THE CLI SHALL validate that the provided URL is a valid HTTP or HTTPS URL

### Requirement 3

**User Story:** As a developer, I want to list all stacks from the IDP API, so that I can see what resources are available for Terraform generation

#### Acceptance Criteria

1. WHEN the user executes the list stacks command, THE CLI SHALL retrieve all stacks from the GET /v1/stacks endpoint
2. THE CLI SHALL display stack information including ID, name, stack type, cloud provider, and creation date
3. WHEN the API request fails, THE CLI SHALL display an error message with the HTTP status code and error details
4. THE CLI SHALL support filtering stacks by stack type via command-line flag
5. THE CLI SHALL support filtering stacks by cloud provider via command-line flag

### Requirement 4

**User Story:** As a developer, I want to retrieve detailed information about a specific stack, so that I can understand its configuration before generating Terraform

#### Acceptance Criteria

1. WHEN the user provides a stack ID, THE CLI SHALL retrieve stack details from the GET /v1/stacks/{id} endpoint
2. THE CLI SHALL display comprehensive stack information including name, description, stack type, programming language, cloud provider, and associated resources
3. WHEN the stack ID does not exist, THE CLI SHALL display an error message indicating the stack was not found
4. THE CLI SHALL display the stack's configuration data in a human-readable format
5. THE CLI SHALL display associated resource types and their configurations

### Requirement 5

**User Story:** As a developer, I want to generate Terraform configuration for a specific stack, so that I can provision the infrastructure resources defined in the IDP

#### Acceptance Criteria

1. WHEN the user provides a stack ID and executes the generate command, THE CLI SHALL retrieve the stack details and associated resources from the IDP API
2. THE CLI SHALL generate valid Terraform HCL configuration files based on the stack's cloud provider and resource types
3. THE CLI SHALL create separate Terraform files for different resource categories (compute, database, networking, etc.)
4. THE CLI SHALL generate a main.tf file with provider configuration and module declarations
5. THE CLI SHALL generate a variables.tf file with input variables for configurable parameters

### Requirement 6

**User Story:** As a developer, I want the generated Terraform to support multiple cloud providers, so that I can provision resources on AWS, Azure, GCP, or on-premises Kubernetes

#### Acceptance Criteria

1. WHEN the stack's cloud provider is AWS, THE CLI SHALL generate Terraform using AWS provider syntax and resource types
2. WHEN the stack's cloud provider is Azure, THE CLI SHALL generate Terraform using Azure provider syntax and resource types
3. WHEN the stack's cloud provider is GCP, THE CLI SHALL generate Terraform using GCP provider syntax and resource types
4. WHEN the stack's cloud provider is on-premises Kubernetes, THE CLI SHALL generate Terraform using Kubernetes provider syntax
5. THE CLI SHALL map IDP resource types to cloud-specific Terraform resources based on the cloud provider

### Requirement 7

**User Story:** As a developer, I want to specify an output directory for generated Terraform files, so that I can organize infrastructure code in my project structure

#### Acceptance Criteria

1. WHEN the user provides an output directory via command-line flag, THE CLI SHALL write all generated Terraform files to that directory
2. WHEN no output directory is provided, THE CLI SHALL write files to a default directory named "terraform-output"
3. THE CLI SHALL create the output directory if it does not exist
4. WHEN the output directory already contains files, THE CLI SHALL prompt the user for confirmation before overwriting
5. THE CLI SHALL support a force flag to overwrite existing files without prompting

### Requirement 8

**User Story:** As a developer, I want the CLI to validate generated Terraform syntax, so that I can ensure the output is valid before applying it

#### Acceptance Criteria

1. WHEN Terraform is installed on the system, THE CLI SHALL execute "terraform validate" on the generated configuration
2. WHEN validation succeeds, THE CLI SHALL display a success message
3. WHEN validation fails, THE CLI SHALL display the validation errors from Terraform
4. WHEN Terraform is not installed, THE CLI SHALL display a warning message but continue execution
5. THE CLI SHALL support a skip-validation flag to bypass validation

### Requirement 9

**User Story:** As a developer, I want to generate Terraform for compute resources based on stack type, so that I can provision Lambda functions, ECS Fargate tasks, or Kubernetes pods

#### Acceptance Criteria

1. WHEN the stack type is RESTFUL_SERVERLESS and cloud provider is AWS, THE CLI SHALL generate Terraform for AWS Lambda functions
2. WHEN the stack type is RESTFUL_API and cloud provider is AWS, THE CLI SHALL generate Terraform for ECS Fargate tasks
3. WHEN the stack type is EVENT_DRIVEN_SERVERLESS and cloud provider is AWS, THE CLI SHALL generate Terraform for AWS Lambda with event source mappings
4. WHEN the cloud provider is on-premises Kubernetes, THE CLI SHALL generate Terraform for Kubernetes Deployment and Service resources
5. THE CLI SHALL include appropriate IAM roles and policies for AWS compute resources

### Requirement 10

**User Story:** As a developer, I want to generate Terraform for infrastructure resources, so that I can provision databases, caches, and queues defined in my stack

#### Acceptance Criteria

1. WHEN a stack includes a PostgreSQL database resource, THE CLI SHALL generate Terraform for the appropriate database service based on cloud provider
2. WHEN a stack includes a cache resource, THE CLI SHALL generate Terraform for Redis or ElastiCache based on cloud provider
3. WHEN a stack includes a queue resource, THE CLI SHALL generate Terraform for SQS, RabbitMQ, or equivalent based on cloud provider
4. THE CLI SHALL include resource configuration parameters from the stack's resource definitions
5. THE CLI SHALL generate appropriate security groups, network rules, and access policies for infrastructure resources

### Requirement 11

**User Story:** As a developer, I want the CLI to support dry-run mode, so that I can preview what Terraform will be generated without writing files

#### Acceptance Criteria

1. WHEN the user provides a dry-run flag, THE CLI SHALL display the generated Terraform configuration to stdout
2. WHEN in dry-run mode, THE CLI SHALL not write any files to disk
3. THE CLI SHALL clearly indicate that dry-run mode is active in the output
4. THE CLI SHALL display the file structure that would be created
5. THE CLI SHALL validate the stack and resource data without generating files

### Requirement 12

**User Story:** As a developer, I want the CLI to provide helpful error messages, so that I can quickly diagnose and fix issues

#### Acceptance Criteria

1. WHEN an API request fails, THE CLI SHALL display the HTTP status code, error message, and suggested resolution
2. WHEN required configuration is missing, THE CLI SHALL display which configuration values are needed and how to provide them
3. WHEN Terraform generation fails, THE CLI SHALL display the specific resource or configuration that caused the failure
4. THE CLI SHALL use color-coded output to distinguish errors, warnings, and success messages
5. THE CLI SHALL support a verbose flag that displays detailed debug information including API requests and responses

### Requirement 13

**User Story:** As a developer, I want to configure the CLI using a configuration file, so that I don't have to provide the same options repeatedly

#### Acceptance Criteria

1. THE CLI SHALL read configuration from a file named ".idp-cli.toml" in the current directory
2. THE CLI SHALL read configuration from a file at "~/.config/idp-cli/config.toml" if no local config exists
3. THE CLI SHALL support configuration values for API base URL, API key, output directory, and cloud provider preferences
4. WHEN both configuration file and command-line flags are provided, THE CLI SHALL prioritize command-line flags
5. THE CLI SHALL provide a command to generate a sample configuration file

### Requirement 14

**User Story:** As a developer, I want to retrieve and display resource type mappings, so that I understand how IDP resources map to cloud-specific implementations

#### Acceptance Criteria

1. WHEN the user executes the list resource-types command, THE CLI SHALL retrieve resource types from the GET /v1/resource-types endpoint
2. THE CLI SHALL display resource type information including name, category, and cloud provider mappings
3. THE CLI SHALL support filtering resource types by category
4. THE CLI SHALL display which Terraform resources will be generated for each resource type and cloud provider combination
5. THE CLI SHALL retrieve cloud provider mappings from the GET /v1/resource-type-cloud-mappings endpoint

### Requirement 15

**User Story:** As a developer, I want to generate Terraform backend configuration, so that I can store Terraform state remotely

#### Acceptance Criteria

1. WHEN the user provides backend configuration via command-line flags, THE CLI SHALL generate a backend.tf file with the specified backend type
2. THE CLI SHALL support S3 backend configuration for AWS with bucket name, key, and region parameters
3. THE CLI SHALL support Azure Storage backend configuration with storage account and container parameters
4. THE CLI SHALL support GCS backend configuration for GCP with bucket name and prefix parameters
5. WHEN no backend configuration is provided, THE CLI SHALL generate configuration for local state storage
