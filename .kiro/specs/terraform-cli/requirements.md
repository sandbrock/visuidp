# Requirements Document

## Introduction

This document specifies the requirements for a command-line interface (CLI) tool that generates infrastructure-as-code and Kubernetes manifests from templates by substituting variables with data from the IDP API. The CLI will be written in Rust and will enable developers to use custom templates for Terraform/OpenTofu and Kubernetes configurations, providing flexibility to match their organization's standards and conventions.

## Glossary

- **CLI**: Command-Line Interface - the Rust-based tool that users interact with via terminal
- **IDP API**: The backend RESTful API service that manages stacks, blueprints, and infrastructure resources
- **API Key**: A credential used to authenticate requests to the IDP API
- **Blueprint**: A reusable template defining infrastructure resources and their configurations
- **Stack**: A concrete instance of infrastructure resources, potentially based on a blueprint, deployed to a specific environment
- **Template**: A file or directory containing infrastructure-as-code or manifest files with variable placeholders
- **Template Variable**: A placeholder in a template file that will be substituted with actual values (e.g., {{variable_name}})
- **Template Directory**: A directory containing one or more template files that will be processed together
- **OpenTofu**: An open-source infrastructure-as-code tool, fork of Terraform, that provisions and manages cloud resources
- **Kubernetes Manifest**: YAML files that define Kubernetes resources such as Deployments, Services, and ConfigMaps
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

**User Story:** As a developer, I want to specify a template directory containing Terraform or Kubernetes template files, so that I can use my organization's infrastructure-as-code standards

#### Acceptance Criteria

1. WHEN the user specifies a template directory via command-line flag, THE CLI SHALL validate that the directory exists
2. IF the template directory does not exist, THEN THE CLI SHALL display an error message with the invalid path
3. WHEN the template directory is valid, THE CLI SHALL recursively discover all template files within the directory
4. THE CLI SHALL support template files with extensions .tf, .yaml, .yml, and .json
5. THE CLI SHALL preserve the directory structure from the template directory in the output directory

### Requirement 3

**User Story:** As a developer, I want to specify a blueprint by name or ID as the data source, so that I can populate templates with blueprint resource definitions

#### Acceptance Criteria

1. WHEN the user specifies a blueprint identifier via command-line argument, THE CLI SHALL fetch the blueprint details from the IDP API
2. IF the blueprint does not exist, THEN THE CLI SHALL display an error message with the invalid identifier
3. WHEN the blueprint is successfully retrieved, THE CLI SHALL extract all resource definitions and their properties into a variable context
4. THE CLI SHALL support both blueprint name and UUID as valid identifiers
5. THE CLI SHALL make blueprint data available to templates through standardized variable names

### Requirement 4

**User Story:** As a developer, I want to specify a stack by name or ID as the data source, so that I can populate templates with deployed infrastructure configurations

#### Acceptance Criteria

1. WHEN the user specifies a stack identifier via command-line argument, THE CLI SHALL fetch the stack details from the IDP API
2. IF the stack does not exist, THEN THE CLI SHALL display an error message with the invalid identifier
3. WHEN the stack is successfully retrieved, THE CLI SHALL extract all stack resources and their configurations into a variable context
4. THE CLI SHALL support both stack name and UUID as valid identifiers
5. THE CLI SHALL make stack data available to templates through standardized variable names

### Requirement 5

**User Story:** As a developer, I want the CLI to substitute template variables with data from blueprints or stacks, so that I can generate customized infrastructure-as-code

#### Acceptance Criteria

1. WHEN processing template files, THE CLI SHALL identify variable placeholders using the syntax {{variable_name}}
2. WHEN a variable placeholder is found, THE CLI SHALL substitute it with the corresponding value from the blueprint or stack data
3. IF a variable placeholder has no corresponding value, THEN THE CLI SHALL either use a default value or display a warning
4. THE CLI SHALL support nested variable access using dot notation (e.g., {{resource.name}})
5. THE CLI SHALL support array indexing in variable placeholders (e.g., {{resources[0].name}})
6. THE CLI SHALL preserve the original file format and structure when substituting variables

### Requirement 6

**User Story:** As a developer, I want the generated files to be written to a user-defined directory, so that I can organize and version control the infrastructure code in my preferred location

#### Acceptance Criteria

1. WHEN the user specifies an output directory via command-line flag, THE CLI SHALL write the processed template files to that directory
2. WHEN the user specifies an output directory via environment variable, THE CLI SHALL write the processed template files to that directory
3. IF no output directory is specified, THEN THE CLI SHALL write files to a default ./output directory in the current working directory
4. THE CLI SHALL preserve the directory structure from the template directory in the output directory
5. IF the output directory does not exist, THEN THE CLI SHALL create the directory structure
6. WHEN writing files, THE CLI SHALL overwrite existing files with a warning message to the user
7. THE CLI SHALL display the paths of all generated files upon successful completion

### Requirement 7

**User Story:** As a developer, I want clear command-line options and help documentation, so that I can easily use the CLI without referring to external documentation

#### Acceptance Criteria

1. WHEN the user runs the CLI with --help flag, THE CLI SHALL display usage information including all available commands and options
2. THE CLI SHALL provide a generate command that accepts template-dir, data-source (blueprint or stack), identifier, and output-dir parameters
3. THE CLI SHALL validate required arguments and display helpful error messages when arguments are missing
4. THE CLI SHALL support common flags such as --api-key, --template-dir, --output-dir, and --api-url
5. THE CLI SHALL display version information when invoked with --version flag
6. THE CLI SHALL provide examples in the help text showing common usage patterns

### Requirement 8

**User Story:** As a developer, I want the CLI to handle API errors gracefully, so that I can understand and resolve issues quickly

#### Acceptance Criteria

1. IF the IDP API returns a 401 Unauthorized response, THEN THE CLI SHALL display an authentication error message
2. IF the IDP API returns a 404 Not Found response, THEN THE CLI SHALL display a message indicating the resource was not found
3. IF the IDP API returns a 500 Internal Server Error, THEN THE CLI SHALL display a message indicating a server error occurred
4. WHEN network connectivity issues occur, THE CLI SHALL display a clear error message about connection failure
5. THE CLI SHALL exit with appropriate non-zero exit codes for different error conditions

### Requirement 9

**User Story:** As a developer, I want the CLI to support configurable API endpoints, so that I can use it with different environments (dev, staging, production)

#### Acceptance Criteria

1. WHEN the user provides an API URL via command-line flag, THE CLI SHALL use that URL for all API requests
2. WHEN the user provides an API URL via environment variable, THE CLI SHALL use the environment variable value
3. IF no API URL is provided, THEN THE CLI SHALL use a default localhost URL for development
4. THE CLI SHALL validate that the API URL is a valid HTTP or HTTPS URL
5. THE CLI SHALL append the appropriate API version prefix to all endpoint paths

### Requirement 10

**User Story:** As a developer, I want to use templates for Kubernetes manifests, so that I can generate deployment configurations for my stacks

#### Acceptance Criteria

1. WHEN the template directory contains YAML or JSON files, THE CLI SHALL process them as Kubernetes manifest templates
2. THE CLI SHALL support variable substitution in Kubernetes manifest files using the same {{variable_name}} syntax
3. THE CLI SHALL preserve YAML formatting and structure when substituting variables
4. THE CLI SHALL support multi-document YAML files (documents separated by ---)
5. THE CLI SHALL validate that generated YAML files are syntactically valid before writing them

### Requirement 11

**User Story:** As a developer, I want to provide additional custom variables to templates, so that I can include environment-specific or deployment-specific values

#### Acceptance Criteria

1. WHEN the user provides a variables file via command-line flag, THE CLI SHALL load additional variables from that file
2. THE CLI SHALL support variables files in JSON and YAML formats
3. WHEN custom variables are provided, THE CLI SHALL merge them with blueprint or stack data
4. IF a custom variable conflicts with a blueprint or stack variable, THEN THE CLI SHALL use the custom variable value
5. THE CLI SHALL display a warning when custom variables override blueprint or stack variables

### Requirement 12

**User Story:** As a developer, I want to see which variables are available from a blueprint or stack, so that I can write effective templates

#### Acceptance Criteria

1. WHEN the user runs the CLI with a --list-variables flag, THE CLI SHALL fetch the blueprint or stack data and display all available variables
2. THE CLI SHALL display variable names, types, and sample values in a readable format
3. THE CLI SHALL show the nested structure of complex variables (objects and arrays)
4. THE CLI SHALL not generate any output files when listing variables
5. THE CLI SHALL support listing variables for both blueprints and stacks
