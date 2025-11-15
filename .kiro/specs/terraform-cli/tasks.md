# Implementation Plan

- [x] 1. Set up Rust project structure and dependencies
  - Initialize Cargo project in idp-cli directory with proper workspace configuration
  - Add core dependencies: clap, reqwest, tokio, serde, serde_json, uuid, thiserror, anyhow, env_logger, log
  - Add development dependencies: mockito, tempfile, assert_cmd, predicates
  - Create Rust source module files in idp-cli/src/ directory: main.rs, cli.rs, api_client.rs, models.rs, generator.rs, resource_mapper.rs, file_writer.rs, error.rs
  - Configure Cargo.toml with proper metadata and feature flags
  - _Requirements: 6.1, 6.5_

- [x] 2. Implement error handling types
  - Define CliError enum with variants for authentication, not found, API, network, IO, configuration, and generation errors
  - Implement Display and Error traits for CliError
  - Add user_message() method for user-friendly error messages
  - Implement From traits for automatic error conversion from reqwest::Error and std::io::Error
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3. Implement command-line argument parsing
  - Create CliArgs struct with command, api_key, api_url, and output_dir fields
  - Define Command enum with Blueprint, Stack, and Version variants
  - Implement clap derive macros for argument parsing with proper help text
  - Add support for environment variables: IDP_API_KEY, IDP_API_URL, IDP_OUTPUT_DIR
  - Implement validation for required arguments and display helpful error messages
  - Add version information display
  - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3_

- [x] 4. Implement data models for API responses
  - Create Blueprint struct with id, name, description, resources, and supported_cloud_providers fields
  - Create BlueprintResource struct with id, name, description, resource_type, cloud_provider, configuration, and cloud_specific_properties fields
  - Create Stack struct with id, name, description, cloud_name, stack_type, stack_resources, and blueprint fields
  - Create StackResource struct with id, name, description, resource_type, cloud_provider, and configuration fields
  - Create ResourceType struct with id, name, and category fields
  - Create CloudProvider struct with id, name, and display_name fields
  - Add serde Deserialize derives to all structs
  - _Requirements: 2.3, 3.3_

- [x] 5. Implement API client for IDP communication
  - Create ApiClient struct with base_url, api_key, and reqwest::Client fields
  - Implement new() constructor that initializes HTTP client with connection pooling
  - Implement get_blueprint() method that fetches blueprint by ID or name from /api/v1/blueprints endpoint
  - Implement get_stack() method that fetches stack by ID or name from /api/v1/stacks endpoint
  - Add Authorization header with Bearer token format for API key authentication
  - Implement error handling for 401, 404, 500 status codes and network errors
  - Add request timeout configuration (default 30 seconds)
  - _Requirements: 1.4, 2.1, 2.2, 3.1, 3.2, 7.1, 7.2, 7.3, 7.4, 8.4, 8.5_

- [x] 6. Implement resource type to Terraform mapping
  - Create ResourceMapper struct with HashMap of (resource_type, cloud_provider) to TerraformResourceType
  - Create TerraformResourceType struct with provider, resource_type, and attribute_mappings fields
  - Implement new() constructor that initializes mappings for common resource types
  - Add mappings for AWS resources: RelationalDatabaseServer → aws_db_instance, ContainerOrchestrator → aws_ecs_cluster, Storage → aws_s3_bucket
  - Add mappings for Azure resources: RelationalDatabaseServer → azurerm_mssql_server, ContainerOrchestrator → azurerm_kubernetes_cluster
  - Add mappings for GCP resources: RelationalDatabaseServer → google_sql_database_instance, ContainerOrchestrator → google_container_cluster
  - Implement get_terraform_resource_type() method for lookup
  - _Requirements: 4.4_

- [x] 7. Implement HCL code generation for providers
  - Create function to generate providers.tf content from cloud provider list
  - Generate terraform required_providers block with appropriate provider sources and versions
  - Generate provider configuration blocks for each unique cloud provider (AWS, Azure, GCP)
  - Add region variable references in provider blocks
  - Include proper formatting and indentation for HCL syntax
  - _Requirements: 4.2_

- [x] 8. Implement HCL code generation for variables
  - Create function to generate variables.tf content from resource configurations
  - Extract configurable properties from resource configurations
  - Generate variable blocks with description, type, and default value
  - Add variables for provider regions
  - Add variables for resource identifiers and names
  - Include proper formatting and indentation for HCL syntax
  - _Requirements: 4.5_

- [x] 9. Implement HCL code generation for resources
  - Create function to generate main.tf content from blueprint or stack resources
  - Map each resource to appropriate Terraform resource type using ResourceMapper
  - Generate resource blocks with proper resource type and name
  - Convert JSON configuration properties to HCL attributes
  - Add tags for managed resources (Name, ManagedBy, Blueprint/Stack)
  - Handle nested configuration objects and lists
  - Include proper formatting and indentation for HCL syntax
  - _Requirements: 4.1, 4.3, 4.4_

- [x] 10. Implement HCL code generation for outputs
  - Create function to generate outputs.tf content from resources
  - Generate output blocks for resource IDs and important attributes
  - Add descriptions to output blocks
  - Include proper formatting and indentation for HCL syntax
  - _Requirements: 4.1_

- [x] 11. Implement code generator orchestration
  - Create CodeGenerator struct with ResourceMapper field
  - Implement new() constructor
  - Implement generate_from_blueprint() method that orchestrates generation of all HCL files from Blueprint
  - Implement generate_from_stack() method that orchestrates generation of all HCL files from Stack
  - Create GeneratedCode struct to hold main_tf, variables_tf, providers_tf, and outputs_tf strings
  - Coordinate calls to provider, variable, resource, and output generation functions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 12. Implement file writer for generated code
  - Create FileWriter struct with output_dir PathBuf field
  - Implement new() constructor
  - Implement ensure_directory_exists() method that creates output directory if needed
  - Implement write_generated_code() method that writes all HCL files to output directory
  - Write main.tf, variables.tf, providers.tf, and outputs.tf files
  - Display warning message when overwriting existing files
  - Set restrictive file permissions (0600) on generated files
  - Return list of written file paths
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 13. Implement main CLI application flow
  - Create main() function with tokio async runtime
  - Initialize logging with env_logger
  - Parse command-line arguments using cli module
  - Validate API key is provided (via flag or environment variable)
  - Determine API URL with proper precedence (flag > env > default)
  - Determine output directory with proper precedence (flag > env > default)
  - Create ApiClient instance
  - Route to appropriate handler based on command (blueprint or stack)
  - Handle Version command by displaying version information
  - Implement error handling and display user-friendly error messages
  - Exit with appropriate exit codes (0 for success, non-zero for errors)
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 7.5, 8.1, 8.2, 8.3, 8.5_

- [x] 14. Implement blueprint command handler
  - Create handle_blueprint() async function that accepts identifier, ApiClient, and output_dir
  - Call ApiClient.get_blueprint() to fetch blueprint from API
  - Create CodeGenerator instance
  - Call generate_from_blueprint() to generate HCL code
  - Create FileWriter instance with output directory
  - Call write_generated_code() to write files
  - Display success message with list of generated file paths
  - Handle and propagate errors appropriately
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 5.7_

- [x] 15. Implement stack command handler
  - Create handle_stack() async function that accepts identifier, ApiClient, and output_dir
  - Call ApiClient.get_stack() to fetch stack from API
  - Create CodeGenerator instance
  - Call generate_from_stack() to generate HCL code
  - Create FileWriter instance with output directory
  - Call write_generated_code() to write files
  - Display success message with list of generated file paths
  - Handle and propagate errors appropriately
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 5.7_

- [ ]* 16. Write unit tests for command parser
  - Test argument parsing with various flag combinations
  - Test environment variable precedence over defaults
  - Test validation of required arguments
  - Test help text generation
  - Test version information display
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 17. Write unit tests for API client
  - Mock HTTP responses using mockito
  - Test successful blueprint retrieval
  - Test successful stack retrieval
  - Test 401 authentication error handling
  - Test 404 not found error handling
  - Test 500 server error handling
  - Test network error handling
  - Test authentication header inclusion
  - _Requirements: 1.4, 2.1, 2.2, 3.1, 3.2, 7.1, 7.2, 7.3, 7.4_

- [ ]* 18. Write unit tests for code generator
  - Test HCL generation from sample Blueprint data
  - Test HCL generation from sample Stack data
  - Test resource mapping for AWS resources
  - Test resource mapping for Azure resources
  - Test resource mapping for GCP resources
  - Test variable generation from configurations
  - Test provider configuration generation
  - Test output generation
  - Verify generated HCL syntax validity
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 19. Write unit tests for resource mapper
  - Test mapping lookup for known AWS resource types
  - Test mapping lookup for known Azure resource types
  - Test mapping lookup for known GCP resource types
  - Test handling of unknown resource types
  - Test attribute mapping transformations
  - _Requirements: 4.4_

- [ ]* 20. Write unit tests for file writer
  - Test directory creation when output directory doesn't exist
  - Test file writing to temporary directory
  - Test overwrite warning when files exist
  - Test file permission setting
  - Test error handling for permission denied
  - Test error handling for disk full
  - _Requirements: 5.3, 5.4, 5.5, 5.6_

- [ ]* 21. Write integration tests for end-to-end flows
  - Test complete blueprint flow with mock API server
  - Test complete stack flow with mock API server
  - Test authentication failure scenario
  - Test 404 not found scenario
  - Test network timeout scenario
  - Test file write permission error scenario
  - Verify generated file contents match expected output
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 7.1, 7.2, 7.4_

- [ ] 22. Create README documentation
  - Write installation instructions for different platforms
  - Document command-line usage with examples
  - Document environment variable configuration
  - Provide example workflows for blueprint and stack generation
  - Include troubleshooting section
  - Add examples of generated OpenTofu code
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 23. Create Cargo.toml with proper metadata
  - Set package name, version, authors, and description
  - Configure edition = "2021"
  - Add license and repository information
  - Configure binary target
  - Set up release profile optimizations
  - _Requirements: 6.5_
