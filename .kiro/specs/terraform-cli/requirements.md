# Requirements Document

## Introduction

This document specifies the requirements for a command-line interface (CLI) tool that interacts with the IDP API to generate OpenTofu (Terraform-compatible) infrastructure-as-code from blueprints and stacks. The CLI will be written in Rust and will enable developers to export their infrastructure definitions as code for version control, review, and deployment automation.

## Glossary

- **CLI**: Command-Line Interface - the Rust-based tool that users interact with via terminal
- **IDP API**: The backend RESTful API service that manages stacks, blueprints, and infrastructure resources
- **API Key**: A credential used to authenticate requests to the IDP API
- **Blueprint**: A reusable template defining infrastructure resources and their configurations
- **Stack**: A concrete instance of infrastructure resources, potentially based on a blueprint, deployed to a specific environment
- **OpenTofu**: An open-source infrastructure-as-code tool, fork of Terraform, that provisions and manages cloud resources
- **Resource**: An infrastructure component such as a database, container orchestrator, or storage service

## Requirements

### Requirement 1

**User Story:** As a developer, I want to authenticate with the IDP API using an API key, so that I can securely access my infrastructure definitions

#### Acceptance Criteria

1. WHEN the user provides an API key via command-line flag, THE CLI SHALL validate the format of the API key before making requests
2. WHEN the user provides an API key via environment variable, THE CLI SHALL read and use the environment variable for authentication
3. IF the API key is missing or invalid, THEN THE CLI SHALL display a clear error message indicating authentication failure
4. WHEN making requests to the IDP API, THE CLI SHALL include the API key in the X-API-Key header

### Requirement 2

**User Story:** As a developer, I want to specify a blueprint by name or ID, so that I can generate OpenTofu code for reusable infrastructure patterns

#### Acceptance Criteria

1. WHEN the user specifies a blueprint identifier via command-line argument, THE CLI SHALL fetch the blueprint details from the IDP API
2. IF the blueprint does not exist, THEN THE CLI SHALL display an error message with the invalid identifier
3. WHEN the blueprint is successfully retrieved, THE CLI SHALL extract all resource definitions and their properties
4. THE CLI SHALL support both blueprint name and UUID as valid identifiers

### Requirement 3

**User Story:** As a developer, I want to specify a stack by name or ID, so that I can generate OpenTofu code for my deployed infrastructure

#### Acceptance Criteria

1. WHEN the user specifies a stack identifier via command-line argument, THE CLI SHALL fetch the stack details from the IDP API
2. IF the stack does not exist, THEN THE CLI SHALL display an error message with the invalid identifier
3. WHEN the stack is successfully retrieved, THE CLI SHALL extract all stack resources and their configurations
4. THE CLI SHALL support both stack name and UUID as valid identifiers

### Requirement 4

**User Story:** As a developer, I want the CLI to generate valid OpenTofu configuration files, so that I can provision infrastructure using standard tooling

#### Acceptance Criteria

1. WHEN generating code from a blueprint or stack, THE CLI SHALL create syntactically valid OpenTofu HCL configuration
2. THE CLI SHALL generate provider configuration blocks for each cloud provider referenced in the resources
3. THE CLI SHALL generate resource blocks with all required and optional properties from the API response
4. THE CLI SHALL use appropriate OpenTofu resource types based on the cloud provider and resource type mappings
5. THE CLI SHALL generate variable definitions for configurable properties

### Requirement 5

**User Story:** As a developer, I want the generated OpenTofu code to be written to a user-defined directory, so that I can organize and version control the infrastructure code in my preferred location

#### Acceptance Criteria

1. WHEN the user specifies an output directory via command-line flag, THE CLI SHALL write the OpenTofu files to that directory
2. WHEN the user specifies an output directory via environment variable, THE CLI SHALL write the OpenTofu files to that directory
3. IF no output directory is specified, THEN THE CLI SHALL write files to a default ./terraform directory in the current working directory
4. THE CLI SHALL create separate files for providers, variables, and resources following OpenTofu best practices
5. IF the output directory does not exist, THEN THE CLI SHALL create the directory structure
6. WHEN writing files, THE CLI SHALL overwrite existing files with a warning message to the user
7. THE CLI SHALL display the paths of all generated files upon successful completion

### Requirement 6

**User Story:** As a developer, I want clear command-line options and help documentation, so that I can easily use the CLI without referring to external documentation

#### Acceptance Criteria

1. WHEN the user runs the CLI with --help flag, THE CLI SHALL display usage information including all available commands and options
2. THE CLI SHALL provide subcommands for blueprint and stack operations
3. THE CLI SHALL validate required arguments and display helpful error messages when arguments are missing
4. THE CLI SHALL support common flags such as --api-key, --output-dir, and --api-url
5. THE CLI SHALL display version information when invoked with --version flag

### Requirement 7

**User Story:** As a developer, I want the CLI to handle API errors gracefully, so that I can understand and resolve issues quickly

#### Acceptance Criteria

1. IF the IDP API returns a 401 Unauthorized response, THEN THE CLI SHALL display an authentication error message
2. IF the IDP API returns a 404 Not Found response, THEN THE CLI SHALL display a message indicating the resource was not found
3. IF the IDP API returns a 500 Internal Server Error, THEN THE CLI SHALL display a message indicating a server error occurred
4. WHEN network connectivity issues occur, THE CLI SHALL display a clear error message about connection failure
5. THE CLI SHALL exit with appropriate non-zero exit codes for different error conditions

### Requirement 8

**User Story:** As a developer, I want the CLI to support configurable API endpoints, so that I can use it with different environments (dev, staging, production)

#### Acceptance Criteria

1. WHEN the user provides an API URL via command-line flag, THE CLI SHALL use that URL for all API requests
2. WHEN the user provides an API URL via environment variable, THE CLI SHALL use the environment variable value
3. IF no API URL is provided, THEN THE CLI SHALL use a default localhost URL for development
4. THE CLI SHALL validate that the API URL is a valid HTTP or HTTPS URL
5. THE CLI SHALL append the appropriate API version prefix to all endpoint paths
