# Implementation Plan

- [x] 1. Update project dependencies for template processing
  - Add handlebars dependency for template engine (version 5.0)
  - Add serde_yaml dependency for YAML processing (version 0.9)
  - Add walkdir dependency for directory traversal (version 2.4)
  - Update Cargo.toml with new dependencies
  - Remove unused dependencies (resource_mapper if no longer needed)
  - _Requirements: 2.1, 2.4, 10.2, 10.3_

- [ ] 2. Update command-line interface for template-based workflow
  - [x] 2.1 Modify Command enum to support new commands
    - Replace Blueprint and Stack commands with Generate command
    - Add Generate variant with data_source, identifier, template_dir, and variables_file fields
    - Add ListVariables variant with data_source and identifier fields
    - Add DataSource enum with Blueprint and Stack variants
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 7.2, 12.1, 12.5_
  
  - [x] 2.2 Update CliArgs struct and validation
    - Add template_dir field to CliArgs
    - Add variables_file field to CliArgs
    - Update validation to require template_dir for Generate command
    - Update help text with new command structure and examples
    - _Requirements: 2.1, 2.2, 7.2, 7.4, 7.6, 11.1, 11.2_
  
  - [x] 2.3 Update default values and environment variables
    - Change default output directory from ./terraform to ./output
    - Add IDP_TEMPLATE_DIR environment variable support
    - Update configuration precedence documentation
    - _Requirements: 6.1, 6.2, 6.3, 9.1, 9.2, 9.3_

- [ ] 3. Implement template discovery module
  - [x] 3.1 Create template discovery structures
    - Create TemplateDiscovery struct with template_dir field
    - Create TemplateFile struct with path, relative_path, and file_type fields
    - Create TemplateFileType enum with Terraform, Yaml, and Json variants
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [x] 3.2 Implement template file discovery
    - Implement discover_templates() method using walkdir
    - Identify files by extension (.tf, .yaml, .yml, .json)
    - Preserve relative paths for output structure
    - Skip hidden files and directories (starting with .)
    - Return Vec<TemplateFile> with discovered templates
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 3.3 Add error handling for template discovery
    - Create DiscoveryError type for template discovery failures
    - Handle directory not found errors
    - Handle permission denied errors
    - Provide clear error messages for discovery failures
    - _Requirements: 2.2, 8.5_

- [ ] 4. Implement variable context builder module
  - [x] 4.1 Create variable context structures
    - Create VariableContextBuilder struct
    - Create VariableContext struct with variables HashMap
    - Implement get() method for variable lookup with dot notation
    - Implement list_all() method for variable inspection
    - _Requirements: 3.5, 4.5, 5.1, 5.2, 5.3, 12.2, 12.3, 12.4_
  
  - [x] 4.2 Implement blueprint variable extraction
    - Implement from_blueprint() method
    - Extract blueprint metadata (id, name, description)
    - Extract resources array with all properties
    - Flatten nested structures with dot notation (e.g., resources[0].name)
    - Create array accessors for list items
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 5.1, 5.2, 5.4_
  
  - [x] 4.3 Implement stack variable extraction
    - Implement from_stack() method
    - Extract stack metadata (id, name, description, cloud_name, stack_type)
    - Extract stack_resources array with all properties
    - Flatten nested structures with dot notation
    - Create array accessors for list items
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 5.1, 5.2, 5.4_
  
  - [x] 4.4 Implement custom variables merging
    - Implement merge_custom_variables() method
    - Load variables from JSON or YAML files
    - Merge custom variables with blueprint/stack data
    - Override blueprint/stack variables with custom values when conflicts occur
    - Display warnings for variable overrides
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 5. Implement template processor module
  - [x] 5.1 Create template processor structures
    - Create TemplateProcessor struct with VariableContext field
    - Create ProcessedFile struct with relative_path and content fields
    - Initialize Handlebars engine with custom configuration
    - _Requirements: 5.1, 5.2, 5.6_
  
  - [x] 5.2 Implement basic template processing
    - Implement process_template() method for string templates
    - Implement process_file() method for TemplateFile processing
    - Support {{variable_name}} syntax for substitution
    - Support dot notation for nested access ({{resource.name}})
    - Support array indexing ({{resources[0].name}})
    - Preserve file formatting (indentation, line endings)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 5.3 Add Handlebars helpers for template features
    - Register default value helper ({{variable|default:"value"}})
    - Register conditional helpers (if/else blocks)
    - Register loop helpers (each blocks)
    - Register case conversion helpers (uppercase, lowercase, capitalize)
    - Register string operation helpers (trim, replace)
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 5.4 Implement YAML validation for Kubernetes manifests
    - Validate YAML syntax after variable substitution
    - Support multi-document YAML files (--- separators)
    - Provide clear error messages for YAML syntax errors
    - _Requirements: 10.2, 10.3, 10.4, 10.5_
  
  - [x] 5.5 Add error handling for template processing
    - Create ProcessingError type for template processing failures
    - Create VariableNotFoundError for missing variables
    - Handle template syntax errors with line numbers
    - Provide suggestions for undefined variables
    - _Requirements: 5.3, 8.5_

- [ ] 6. Update file writer for template-based output
  - [x] 6.1 Modify FileWriter for processed templates
    - Update write_generated_code() to write_processed_files()
    - Accept Vec<ProcessedFile> instead of GeneratedCode
    - Preserve directory structure from template directory
    - Create parent directories as needed
    - _Requirements: 6.1, 6.2, 6.4, 6.5_
  
  - [x] 6.2 Implement file overwrite warnings
    - Check if output files already exist
    - Display warning message before overwriting
    - Write files atomically (write to temp, then rename)
    - Set appropriate file permissions
    - _Requirements: 6.6, 6.7_

- [ ] 7. Implement generate command handler
  - [x] 7.1 Create handle_generate() function
    - Accept data_source, identifier, template_dir, variables_file, api_client, and output_dir parameters
    - Fetch blueprint or stack data based on data_source
    - Build variable context from API response
    - Merge custom variables if variables_file is provided
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 11.1, 11.2_
  
  - [x] 7.2 Implement template processing workflow
    - Discover templates in template_dir
    - Create TemplateProcessor with variable context
    - Process each template file
    - Collect processed files
    - _Requirements: 2.1, 2.2, 5.1, 5.2_
  
  - [x] 7.3 Implement file writing and success reporting
    - Write processed files to output directory
    - Display success message with generated file paths
    - Provide next steps guidance (e.g., terraform init, kubectl apply)
    - Handle and propagate errors appropriately
    - _Requirements: 6.7, 8.5_

- [ ] 8. Implement list-variables command handler
  - [x] 8.1 Create handle_list_variables() function
    - Accept data_source, identifier, and api_client parameters
    - Fetch blueprint or stack data based on data_source
    - Build variable context from API response
    - _Requirements: 12.1, 12.2, 12.5_
  
  - [x] 8.2 Implement variable display formatting
    - Display variable names, types, and sample values
    - Show nested structure of complex variables (objects and arrays)
    - Format output in readable table or tree structure
    - Do not generate any output files
    - _Requirements: 12.2, 12.3, 12.4_

- [ ] 9. Update main CLI application flow
  - [x] 9.1 Update command routing
    - Route Generate command to handle_generate()
    - Route ListVariables command to handle_list_variables()
    - Keep Version command handling
    - _Requirements: 7.2, 12.1_
  
  - [x] 9.2 Update validation and error handling
    - Validate template_dir exists for Generate command
    - Validate variables_file exists if provided
    - Update error messages for new command structure
    - _Requirements: 2.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. Remove obsolete code generation modules
  - Remove or refactor generator.rs (old HCL generation)
  - Remove resource_mapper.rs (no longer needed for templates)
  - Clean up unused imports and dependencies
  - Update module declarations in lib.rs or main.rs
  - _Requirements: N/A (cleanup)_

- [x] 11. Write unit tests for template discovery
  - Test template file discovery in directory
  - Test file type identification by extension
  - Test relative path preservation
  - Test hidden file/directory exclusion
  - Test error handling for non-existent directories
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 12. Write unit tests for variable context builder
  - Test blueprint variable extraction
  - Test stack variable extraction
  - Test nested structure flattening
  - Test array accessor creation
  - Test custom variable merging
  - Test variable override warnings
  - _Requirements: 3.5, 4.5, 5.1, 5.2, 5.4, 11.3, 11.4, 11.5_

- [x] 13. Write unit tests for template processor
  - Test basic variable substitution
  - Test dot notation access
  - Test array indexing
  - Test default value helper
  - Test conditional blocks
  - Test loop blocks
  - Test case conversion helpers
  - Test string operation helpers
  - Test YAML validation
  - Test error handling for undefined variables
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.3, 10.5_

- [x] 14. Write integration tests for end-to-end template processing
  - Test complete generate flow with Terraform templates
  - Test complete generate flow with Kubernetes templates
  - Test generate flow with custom variables
  - Test list-variables command output
  - Test error scenarios (missing template dir, invalid templates)
  - Verify output file structure matches template structure
  - _Requirements: 2.5, 5.6, 6.4, 6.7, 12.2, 12.4_

- [x] 15. Update README documentation
  - Document new template-based workflow
  - Provide example template structures for Terraform
  - Provide example template structures for Kubernetes
  - Document variable syntax and available helpers
  - Document custom variables file format
  - Include examples of generate and list-variables commands
  - Add troubleshooting section for template errors
  - _Requirements: 7.2, 7.6, 11.1, 12.1_

- [x] 16. Create example template directories
  - Create examples/terraform/ with sample Terraform templates
  - Create examples/kubernetes/ with sample Kubernetes manifest templates
  - Include README in each example directory explaining usage
  - Demonstrate common patterns (loops, conditionals, defaults)
  - _Requirements: 7.6_
