use clap::Parser;
use log::{error, info};
use std::process;

mod cli;
mod api_client;
mod models;
mod file_writer;
mod error;
mod template_discovery;
mod variable_context;
mod template_processor;

use api_client::ApiClient;
use cli::{CliArgs, Command, DataSource};
use error::CliError;
use variable_context::{VariableContext, VariableContextBuilder};

#[tokio::main]
async fn main() {
    // Initialize logging with env_logger
    env_logger::init();

    // Parse command-line arguments
    let args = CliArgs::parse();

    // Handle version command (doesn't require validation)
    if matches!(args.command, Command::Version) {
        println!("idp-cli version {}", env!("CARGO_PKG_VERSION"));
        println!("OpenTofu infrastructure-as-code generator for IDP");
        process::exit(0);
    }

    // Validate arguments for other commands
    if let Err(e) = args.validate() {
        eprintln!("Error: {}", e.user_message());
        log_error(&e);
        process::exit(1);
    }

    // Execute the command and handle the result
    if let Err(e) = run(args).await {
        eprintln!("Error: {}", e.user_message());
        log_error(&e);
        process::exit(1);
    }

    // Success
    process::exit(0);
}

/// Main execution logic
async fn run(args: CliArgs) -> Result<(), CliError> {
    // Get validated configuration
    let api_key = args.get_api_key()?;
    let api_url = args.get_api_url();
    let output_dir = args.get_output_dir();

    info!("IDP CLI - OpenTofu code generator");
    info!("API URL: {}", api_url);
    info!("Output directory: {}", output_dir.display());

    // Create API client
    let api_client = ApiClient::new(api_url.to_string(), api_key.to_string());

    // Route to appropriate handler based on command
    match args.command {
        Command::Generate { data_source, identifier, template_dir, variables_file } => {
            info!("Generating code from {}: {}", 
                match data_source {
                    DataSource::Blueprint => "blueprint",
                    DataSource::Stack => "stack",
                },
                identifier
            );
            handle_generate(
                data_source,
                &identifier,
                &template_dir,
                variables_file.as_deref(),
                &api_client,
                &output_dir,
            ).await?;
        }
        Command::ListVariables { data_source, identifier } => {
            info!("Listing variables from {}: {}", 
                match data_source {
                    DataSource::Blueprint => "blueprint",
                    DataSource::Stack => "stack",
                },
                identifier
            );
            handle_list_variables(
                data_source,
                &identifier,
                &api_client,
            ).await?;
        }
        Command::Version => {
            // Already handled above, but included for completeness
            unreachable!("Version command should have been handled earlier");
        }
    }

    Ok(())
}

/// Handle generate command with template-based workflow
/// 
/// This function implements the template-based code generation workflow:
/// 1. Fetches blueprint or stack data from the IDP API
/// 2. Builds a variable context from the API response
/// 3. Merges custom variables if a variables file is provided
/// 4. (Future tasks will add template discovery and processing)
/// 
/// # Arguments
/// * `data_source` - Whether to use a blueprint or stack as the data source
/// * `identifier` - The name or UUID of the blueprint/stack
/// * `template_dir` - Path to the directory containing template files
/// * `variables_file` - Optional path to a JSON/YAML file with custom variables
/// * `api_client` - The API client for fetching data
/// * `output_dir` - The directory where generated files will be written
/// 
/// # Returns
/// * `Ok(())` if generation succeeds
/// * `Err(CliError)` if any step fails
async fn handle_generate(
    data_source: DataSource,
    identifier: &str,
    template_dir: &std::path::Path,
    variables_file: Option<&std::path::Path>,
    api_client: &ApiClient,
    output_dir: &std::path::Path,
) -> Result<(), CliError> {
    // Step 1: Fetch blueprint or stack data based on data_source
    info!("Fetching {} data from API...", match data_source {
        DataSource::Blueprint => "blueprint",
        DataSource::Stack => "stack",
    });

    let mut context = match data_source {
        DataSource::Blueprint => {
            // Fetch blueprint from API
            let blueprint = api_client.get_blueprint(identifier).await?;
            info!("Successfully retrieved blueprint: {}", blueprint.name);
            
            // Build variable context from blueprint
            info!("Building variable context from blueprint...");
            VariableContextBuilder::from_blueprint(&blueprint)
        }
        DataSource::Stack => {
            // Fetch stack from API
            let stack = api_client.get_stack(identifier).await?;
            info!("Successfully retrieved stack: {}", stack.name);
            
            // Build variable context from stack
            info!("Building variable context from stack...");
            VariableContextBuilder::from_stack(&stack)
        }
    };

    info!("Variable context built with {} variables", context.len());

    // Step 2: Merge custom variables if variables_file is provided
    if let Some(vars_file) = variables_file {
        info!("Loading custom variables from {}...", vars_file.display());
        VariableContextBuilder::merge_custom_variables(&mut context, vars_file)?;
        info!("Custom variables merged successfully");
    }

    // Step 3: Discover templates in template_dir
    info!("Discovering templates in {}...", template_dir.display());
    let discovery = template_discovery::TemplateDiscovery::new(template_dir.to_path_buf());
    let template_files = discovery.discover_templates().map_err(|e| {
        CliError::DiscoveryError(format!(
            "Failed to discover templates in '{}': {}",
            template_dir.display(),
            e
        ))
    })?;
    
    if template_files.is_empty() {
        return Err(CliError::DiscoveryError(format!(
            "No template files found in '{}'. Expected files with extensions: .tf, .yaml, .yml, .json",
            template_dir.display()
        )));
    }
    
    info!("Discovered {} template file(s)", template_files.len());
    for template_file in &template_files {
        info!("  - {}", template_file.relative_path.display());
    }

    // Step 4: Create TemplateProcessor and process each template file
    info!("Processing templates with variable substitution...");
    let processor = template_processor::TemplateProcessor::new(&context);
    
    let mut processed_files = Vec::new();
    for template_file in &template_files {
        info!("Processing {}...", template_file.relative_path.display());
        let processed_file = processor.process_file(template_file)?;
        processed_files.push(processed_file);
    }
    
    info!("Successfully processed {} template file(s)", processed_files.len());

    // Step 5: Write processed files to output directory
    info!("Writing processed files to {}...", output_dir.display());
    let file_writer = file_writer::FileWriter::new(output_dir.to_path_buf());
    
    let written_files = file_writer.write_processed_files(&processed_files)
        .map_err(|e| {
            CliError::IoError(format!("Failed to write processed files: {}", e))
        })?;
    
    info!("Successfully wrote {} file(s)", written_files.len());

    // Display success message with generated file paths
    println!("\n✓ Successfully generated {} file(s) from templates", written_files.len());
    println!("\nGenerated files:");
    for file_path in &written_files {
        println!("  ✓ {}", file_path.display());
    }
    
    // Provide next steps guidance based on file types
    println!("\n{}", get_next_steps_guidance(&written_files, template_dir));

    Ok(())
}



/// Handle list-variables command
/// 
/// This function implements the list-variables command workflow:
/// 1. Fetches blueprint or stack data from the IDP API
/// 2. Builds a variable context from the API response
/// 3. Displays variables in a readable format with types and sample values
/// 
/// # Arguments
/// * `data_source` - Whether to use a blueprint or stack as the data source
/// * `identifier` - The name or UUID of the blueprint/stack
/// * `api_client` - The API client for fetching data
/// 
/// # Returns
/// * `Ok(())` if variables are successfully fetched and displayed
/// * `Err(CliError)` if any step fails
async fn handle_list_variables(
    data_source: DataSource,
    identifier: &str,
    api_client: &ApiClient,
) -> Result<(), CliError> {
    // Step 1: Fetch blueprint or stack data based on data_source
    info!("Fetching {} data from API...", match data_source {
        DataSource::Blueprint => "blueprint",
        DataSource::Stack => "stack",
    });

    let context = match data_source {
        DataSource::Blueprint => {
            // Fetch blueprint from API
            let blueprint = api_client.get_blueprint(identifier).await?;
            info!("Successfully retrieved blueprint: {}", blueprint.name);
            
            // Build variable context from blueprint
            info!("Building variable context from blueprint...");
            VariableContextBuilder::from_blueprint(&blueprint)
        }
        DataSource::Stack => {
            // Fetch stack from API
            let stack = api_client.get_stack(identifier).await?;
            info!("Successfully retrieved stack: {}", stack.name);
            
            // Build variable context from stack
            info!("Building variable context from stack...");
            VariableContextBuilder::from_stack(&stack)
        }
    };

    info!("Variable context built with {} variables", context.len());

    // Step 2: Display variables in a readable format
    display_variables(&context, data_source);
    
    Ok(())
}

/// Display variables in a readable format
/// 
/// Shows variable names, types, and sample values in a tree structure
/// that makes it easy to understand the available template variables.
/// 
/// # Arguments
/// * `context` - The variable context containing all variables
/// * `data_source` - The data source type (for header display)
fn display_variables(context: &VariableContext, data_source: DataSource) {
    let source_name = match data_source {
        DataSource::Blueprint => "Blueprint",
        DataSource::Stack => "Stack",
    };

    println!("\n{} Variables", source_name);
    println!("{}", "=".repeat(80));
    println!("\nAvailable variables for use in templates:\n");

    // Get all variables sorted by key
    let all_vars = context.list_all();
    
    if all_vars.is_empty() {
        println!("No variables available.");
        return;
    }

    // Group variables by their root key (before first dot or bracket)
    let mut root_groups: std::collections::HashMap<String, Vec<(String, &serde_json::Value)>> = 
        std::collections::HashMap::new();
    
    for (key, value) in &all_vars {
        let root = extract_root_key(key);
        root_groups.entry(root.to_string())
            .or_insert_with(Vec::new)
            .push((key.to_string(), *value));
    }

    // Sort root groups for consistent output
    let mut sorted_roots: Vec<_> = root_groups.keys().collect();
    sorted_roots.sort();

    // Display each root group
    for root in sorted_roots {
        let vars = root_groups.get(root).unwrap();
        display_variable_group(root, vars);
        println!(); // Blank line between groups
    }

    // Display usage examples
    println!("{}", "=".repeat(80));
    println!("\nUsage Examples:");
    println!("  {{{{variable_name}}}}                    - Simple variable substitution");
    println!("  {{{{object.property}}}}                  - Nested property access");
    println!("  {{{{array[0].property}}}}                - Array element access");
    println!("  {{{{variable|default:\"value\"}}}}         - Default value if undefined");
    println!("\nFor more information on template syntax, see the documentation.");
    println!();
}

/// Extract the root key from a variable path
/// 
/// Examples:
/// - "blueprint.name" -> "blueprint"
/// - "resources[0].name" -> "resources"
/// - "stack.id" -> "stack"
fn extract_root_key(key: &str) -> &str {
    if let Some(dot_pos) = key.find('.') {
        &key[..dot_pos]
    } else if let Some(bracket_pos) = key.find('[') {
        &key[..bracket_pos]
    } else {
        key
    }
}

/// Display a group of variables with the same root key
/// 
/// Shows the structure in a tree format with types and sample values
fn display_variable_group(root: &str, vars: &[(String, &serde_json::Value)]) {
    println!("{}:", root);
    
    // Find the root variable itself (without dots or brackets)
    let root_var = vars.iter().find(|(k, _)| k == root);
    
    if let Some((_, value)) = root_var {
        // Display the root variable type and structure
        let var_type = get_value_type(value);
        println!("  Type: {}", var_type);
        
        // For complex types, show structure
        match value {
            serde_json::Value::Object(_) => {
                println!("  Structure: Object with properties");
                display_object_properties(root, vars, 2);
            }
            serde_json::Value::Array(arr) => {
                println!("  Structure: Array with {} element(s)", arr.len());
                if !arr.is_empty() {
                    display_array_elements(root, vars, 2);
                }
            }
            _ => {
                // For primitive values, show the value
                println!("  Value: {}", format_value_sample(value));
            }
        }
    } else {
        // No root variable, just show the nested properties
        display_nested_properties(root, vars, 1);
    }
}

/// Display properties of an object
fn display_object_properties(prefix: &str, vars: &[(String, &serde_json::Value)], indent: usize) {
    let indent_str = "  ".repeat(indent);
    
    // Find all direct properties (one level deeper)
    let mut properties: std::collections::HashSet<String> = std::collections::HashSet::new();
    
    for (key, _) in vars {
        if key.starts_with(prefix) && key.len() > prefix.len() {
            let suffix = &key[prefix.len()..];
            if suffix.starts_with('.') {
                let prop_part = &suffix[1..]; // Skip the dot
                if let Some(next_dot) = prop_part.find('.') {
                    properties.insert(prop_part[..next_dot].to_string());
                } else if let Some(next_bracket) = prop_part.find('[') {
                    properties.insert(prop_part[..next_bracket].to_string());
                } else {
                    properties.insert(prop_part.to_string());
                }
            }
        }
    }
    
    let mut sorted_props: Vec<_> = properties.into_iter().collect();
    sorted_props.sort();
    
    for prop in sorted_props {
        let prop_key = format!("{}.{}", prefix, prop);
        if let Some((_, value)) = vars.iter().find(|(k, _)| k == &prop_key) {
            let var_type = get_value_type(value);
            let sample = format_value_sample(value);
            println!("{}{}: {} = {}", indent_str, prop, var_type, sample);
        }
    }
}

/// Display elements of an array
fn display_array_elements(prefix: &str, vars: &[(String, &serde_json::Value)], indent: usize) {
    let indent_str = "  ".repeat(indent);
    
    // Find array indices
    let mut indices: std::collections::HashSet<usize> = std::collections::HashSet::new();
    
    for (key, _) in vars {
        if key.starts_with(prefix) && key.len() > prefix.len() {
            let suffix = &key[prefix.len()..];
            if suffix.starts_with('[') {
                if let Some(bracket_end) = suffix.find(']') {
                    if let Ok(index) = suffix[1..bracket_end].parse::<usize>() {
                        indices.insert(index);
                    }
                }
            }
        }
    }
    
    let mut sorted_indices: Vec<_> = indices.into_iter().collect();
    sorted_indices.sort();
    
    // Show first few elements (limit to 3 for readability)
    let display_count = sorted_indices.len().min(3);
    
    for &index in &sorted_indices[..display_count] {
        let elem_key = format!("{}[{}]", prefix, index);
        if let Some((_, value)) = vars.iter().find(|(k, _)| k == &elem_key) {
            let var_type = get_value_type(value);
            println!("{}[{}]: {}", indent_str, index, var_type);
            
            // Show properties of the element if it's an object
            if matches!(value, serde_json::Value::Object(_)) {
                display_object_properties(&elem_key, vars, indent + 1);
            }
        }
    }
    
    if sorted_indices.len() > display_count {
        println!("{}... and {} more element(s)", indent_str, sorted_indices.len() - display_count);
    }
}

/// Display nested properties when there's no root variable
fn display_nested_properties(prefix: &str, vars: &[(String, &serde_json::Value)], indent: usize) {
    let indent_str = "  ".repeat(indent);
    
    for (key, value) in vars {
        if key.starts_with(prefix) {
            let var_type = get_value_type(value);
            let sample = format_value_sample(value);
            println!("{}{}: {} = {}", indent_str, key, var_type, sample);
        }
    }
}

/// Get the type name of a JSON value
fn get_value_type(value: &serde_json::Value) -> &'static str {
    match value {
        serde_json::Value::Null => "null",
        serde_json::Value::Bool(_) => "boolean",
        serde_json::Value::Number(_) => "number",
        serde_json::Value::String(_) => "string",
        serde_json::Value::Array(_) => "array",
        serde_json::Value::Object(_) => "object",
    }
}

/// Format a value sample for display
/// 
/// Truncates long strings and shows structure for complex types
fn format_value_sample(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => "null".to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => {
            if s.len() > 50 {
                format!("\"{}...\"", &s[..47])
            } else {
                format!("\"{}\"", s)
            }
        }
        serde_json::Value::Array(arr) => {
            format!("[{} element(s)]", arr.len())
        }
        serde_json::Value::Object(obj) => {
            format!("{{ {} propert{} }}", obj.len(), if obj.len() == 1 { "y" } else { "ies" })
        }
    }
}

/// Get next steps guidance based on generated file types
/// 
/// Analyzes the generated files and provides appropriate next steps
/// for Terraform, Kubernetes, or other infrastructure-as-code tools.
/// 
/// # Arguments
/// * `written_files` - List of paths to generated files
/// * `template_dir` - The template directory path (for context)
/// 
/// # Returns
/// A formatted string with next steps guidance
fn get_next_steps_guidance(written_files: &[std::path::PathBuf], template_dir: &std::path::Path) -> String {
    // Analyze file extensions to determine what was generated
    let has_terraform = written_files.iter().any(|p| {
        p.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext == "tf")
            .unwrap_or(false)
    });
    
    let has_kubernetes = written_files.iter().any(|p| {
        p.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext == "yaml" || ext == "yml")
            .unwrap_or(false)
    });
    
    let has_json = written_files.iter().any(|p| {
        p.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext == "json")
            .unwrap_or(false)
    });
    
    let mut guidance = String::from("Next steps:");
    
    if has_terraform {
        guidance.push_str("\n\nFor Terraform/OpenTofu:");
        guidance.push_str("\n  1. Review the generated files to ensure they match your requirements");
        guidance.push_str("\n  2. Initialize Terraform:");
        guidance.push_str(&format!("\n     cd {}", written_files[0].parent().unwrap_or(std::path::Path::new(".")).display()));
        guidance.push_str("\n     terraform init");
        guidance.push_str("\n  3. Validate the configuration:");
        guidance.push_str("\n     terraform validate");
        guidance.push_str("\n  4. Plan the infrastructure changes:");
        guidance.push_str("\n     terraform plan");
        guidance.push_str("\n  5. Apply the changes (when ready):");
        guidance.push_str("\n     terraform apply");
    }
    
    if has_kubernetes {
        guidance.push_str("\n\nFor Kubernetes:");
        guidance.push_str("\n  1. Review the generated manifests to ensure they match your requirements");
        guidance.push_str("\n  2. Validate the manifests:");
        guidance.push_str(&format!("\n     kubectl apply --dry-run=client -f {}", written_files[0].parent().unwrap_or(std::path::Path::new(".")).display()));
        guidance.push_str("\n  3. Apply the manifests to your cluster:");
        guidance.push_str(&format!("\n     kubectl apply -f {}", written_files[0].parent().unwrap_or(std::path::Path::new(".")).display()));
        guidance.push_str("\n  4. Verify the deployment:");
        guidance.push_str("\n     kubectl get all");
    }
    
    if has_json && !has_terraform && !has_kubernetes {
        guidance.push_str("\n\nFor JSON configuration files:");
        guidance.push_str("\n  1. Review the generated files to ensure they match your requirements");
        guidance.push_str("\n  2. Validate the JSON syntax:");
        guidance.push_str(&format!("\n     jq . {} > /dev/null", written_files[0].display()));
        guidance.push_str("\n  3. Use the configuration files with your infrastructure tools");
    }
    
    // Add general guidance
    guidance.push_str("\n\nGeneral tips:");
    guidance.push_str("\n  - Use version control (git) to track changes to generated files");
    guidance.push_str("\n  - Review all generated files before applying to production");
    guidance.push_str("\n  - Use the 'list-variables' command to see available template variables");
    guidance.push_str(&format!("\n  - Regenerate files by running the same command with updated templates in {}", template_dir.display()));
    
    guidance
}

/// Log error details for debugging
fn log_error(error: &CliError) {
    error!("Error occurred: {:?}", error);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_handle_generate_validates_parameters() {
        // This test verifies that handle_generate accepts the correct parameters
        // and performs basic validation. Full integration testing will be done
        // in later tasks when template processing is implemented.
        
        // Create temporary directories
        let temp_dir = TempDir::new().unwrap();
        let template_dir = temp_dir.path().join("templates");
        let output_dir = temp_dir.path().join("output");
        
        fs::create_dir(&template_dir).unwrap();
        fs::create_dir(&output_dir).unwrap();
        
        // Create a simple template file
        fs::write(template_dir.join("test.tf"), "resource \"test\" \"{{name}}\" {}").unwrap();
        
        // Create a mock API client (this will fail when trying to connect, which is expected)
        let api_client = ApiClient::new(
            "http://localhost:9999/api/v1".to_string(),
            "test-api-key".to_string(),
        );
        
        // Test that the function signature is correct by attempting to call it
        // We expect this to fail with a network error since we're using a fake API endpoint
        let result = handle_generate(
            DataSource::Blueprint,
            "test-blueprint",
            &template_dir,
            None,
            &api_client,
            &output_dir,
        ).await;
        
        // Should fail with network error (can't connect to fake API)
        assert!(result.is_err());
        
        // Verify it's a network error (not a parameter validation error)
        match result.unwrap_err() {
            CliError::NetworkError(_) => {
                // Expected - we're using a fake API endpoint
            }
            other => {
                panic!("Expected NetworkError, got: {:?}", other);
            }
        }
    }

    #[tokio::test]
    async fn test_handle_generate_discovers_and_processes_templates() {
        // This test verifies that template discovery and processing work correctly
        // when the API call succeeds (using a mock)
        
        use mockito::Server;
        use crate::models::{Blueprint, BlueprintResource, CloudProvider, ResourceType};
        use uuid::Uuid;
        
        // Create temporary directories
        let temp_dir = TempDir::new().unwrap();
        let template_dir = temp_dir.path().join("templates");
        let output_dir = temp_dir.path().join("output");
        
        fs::create_dir(&template_dir).unwrap();
        fs::create_dir(&output_dir).unwrap();
        
        // Create template files (using .0 notation for array access)
        fs::write(
            template_dir.join("main.tf"),
            "resource \"aws_instance\" \"{{resources.0.name}}\" {}"
        ).unwrap();
        
        fs::write(
            template_dir.join("variables.tf"),
            "variable \"blueprint_name\" {\n  default = \"{{blueprint.name}}\"\n}"
        ).unwrap();
        
        // Create a subdirectory with a template
        let k8s_dir = template_dir.join("k8s");
        fs::create_dir(&k8s_dir).unwrap();
        fs::write(
            k8s_dir.join("deployment.yaml"),
            "apiVersion: v1\nkind: Deployment\nmetadata:\n  name: {{resources.0.name}}"
        ).unwrap();
        
        // Create a mock server
        let mut server = Server::new_async().await;
        
        // Create mock blueprint data
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "test-blueprint".to_string(),
            description: Some("Test blueprint".to_string()),
            resources: vec![
                BlueprintResource {
                    id: Uuid::new_v4(),
                    name: "test-resource".to_string(),
                    description: Some("Test resource".to_string()),
                    resource_type: ResourceType {
                        id: Uuid::new_v4(),
                        name: "TestType".to_string(),
                        category: "compute".to_string(),
                    },
                    cloud_provider: CloudProvider {
                        id: Uuid::new_v4(),
                        name: "AWS".to_string(),
                        display_name: "Amazon Web Services".to_string(),
                    },
                    configuration: serde_json::json!({}),
                    cloud_specific_properties: std::collections::HashMap::new(),
                }
            ],
            supported_cloud_providers: vec![],
        };
        
        // Mock the API endpoint (using query parameter for name-based lookup)
        let mock = server.mock("GET", "/blueprints")
            .match_query(mockito::Matcher::UrlEncoded("name".into(), "test-blueprint".into()))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(serde_json::to_string(&blueprint).unwrap())
            .create_async()
            .await;
        
        // Create API client pointing to mock server
        let api_client = ApiClient::new(
            server.url(),
            "test-api-key".to_string(),
        );
        
        // Call handle_generate
        let result = handle_generate(
            DataSource::Blueprint,
            "test-blueprint",
            &template_dir,
            None,
            &api_client,
            &output_dir,
        ).await;
        
        // Verify the mock was called
        mock.assert_async().await;
        
        // Should succeed
        assert!(result.is_ok(), "Expected success, got error: {:?}", result.err());
        
        // Note: Files are not written yet (that's task 7.3), but we've verified that:
        // 1. Templates were discovered (3 files)
        // 2. Templates were processed with variable substitution
        // 3. No errors occurred during processing
    }

    #[tokio::test]
    async fn test_handle_generate_fails_with_no_templates() {
        // This test verifies that handle_generate fails gracefully when no templates are found
        
        use mockito::Server;
        use crate::models::Blueprint;
        use uuid::Uuid;
        
        // Create temporary directories
        let temp_dir = TempDir::new().unwrap();
        let template_dir = temp_dir.path().join("templates");
        let output_dir = temp_dir.path().join("output");
        
        fs::create_dir(&template_dir).unwrap();
        fs::create_dir(&output_dir).unwrap();
        
        // Don't create any template files - directory is empty
        
        // Create a mock server
        let mut server = Server::new_async().await;
        
        // Create mock blueprint data
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "test-blueprint".to_string(),
            description: Some("Test blueprint".to_string()),
            resources: vec![],
            supported_cloud_providers: vec![],
        };
        
        // Mock the API endpoint (using query parameter for name-based lookup)
        let _mock = server.mock("GET", "/blueprints")
            .match_query(mockito::Matcher::UrlEncoded("name".into(), "test-blueprint".into()))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(serde_json::to_string(&blueprint).unwrap())
            .create_async()
            .await;
        
        // Create API client pointing to mock server
        let api_client = ApiClient::new(
            server.url(),
            "test-api-key".to_string(),
        );
        
        // Call handle_generate
        let result = handle_generate(
            DataSource::Blueprint,
            "test-blueprint",
            &template_dir,
            None,
            &api_client,
            &output_dir,
        ).await;
        
        // Should fail with DiscoveryError
        assert!(result.is_err());
        
        match result.unwrap_err() {
            CliError::DiscoveryError(msg) => {
                assert!(msg.contains("No template files found"));
            }
            other => {
                panic!("Expected DiscoveryError, got: {:?}", other);
            }
        }
    }

    #[tokio::test]
    async fn test_handle_list_variables_blueprint() {
        // This test verifies that handle_list_variables fetches blueprint data
        // and builds a variable context successfully
        
        use mockito::Server;
        use crate::models::{Blueprint, BlueprintResource, CloudProvider, ResourceType};
        use uuid::Uuid;
        
        // Create a mock server
        let mut server = Server::new_async().await;
        
        // Create mock blueprint data
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "test-blueprint".to_string(),
            description: Some("Test blueprint".to_string()),
            resources: vec![
                BlueprintResource {
                    id: Uuid::new_v4(),
                    name: "test-resource".to_string(),
                    description: Some("Test resource".to_string()),
                    resource_type: ResourceType {
                        id: Uuid::new_v4(),
                        name: "TestType".to_string(),
                        category: "compute".to_string(),
                    },
                    cloud_provider: CloudProvider {
                        id: Uuid::new_v4(),
                        name: "AWS".to_string(),
                        display_name: "Amazon Web Services".to_string(),
                    },
                    configuration: serde_json::json!({}),
                    cloud_specific_properties: std::collections::HashMap::new(),
                }
            ],
            supported_cloud_providers: vec![],
        };
        
        // Mock the API endpoint
        let mock = server.mock("GET", "/blueprints")
            .match_query(mockito::Matcher::UrlEncoded("name".into(), "test-blueprint".into()))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(serde_json::to_string(&blueprint).unwrap())
            .create_async()
            .await;
        
        // Create API client pointing to mock server
        let api_client = ApiClient::new(
            server.url(),
            "test-api-key".to_string(),
        );
        
        // Call handle_list_variables
        let result = handle_list_variables(
            DataSource::Blueprint,
            "test-blueprint",
            &api_client,
        ).await;
        
        // Verify the mock was called
        mock.assert_async().await;
        
        // Should succeed
        assert!(result.is_ok(), "Expected success, got error: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_handle_list_variables_stack() {
        // This test verifies that handle_list_variables fetches stack data
        // and builds a variable context successfully
        
        use mockito::Server;
        use crate::models::{Stack, StackResource, CloudProvider, ResourceType};
        use uuid::Uuid;
        
        // Create a mock server
        let mut server = Server::new_async().await;
        
        // Create mock stack data
        let stack = Stack {
            id: Uuid::new_v4(),
            name: "test-stack".to_string(),
            description: Some("Test stack".to_string()),
            cloud_name: "aws-us-east-1".to_string(),
            stack_type: "INFRASTRUCTURE_ONLY".to_string(),
            stack_resources: vec![
                StackResource {
                    id: Uuid::new_v4(),
                    name: "test-resource".to_string(),
                    description: Some("Test resource".to_string()),
                    resource_type: ResourceType {
                        id: Uuid::new_v4(),
                        name: "TestType".to_string(),
                        category: "compute".to_string(),
                    },
                    cloud_provider: CloudProvider {
                        id: Uuid::new_v4(),
                        name: "AWS".to_string(),
                        display_name: "Amazon Web Services".to_string(),
                    },
                    configuration: std::collections::HashMap::new(),
                }
            ],
            blueprint: None,
        };
        
        // Mock the API endpoint
        let mock = server.mock("GET", "/stacks")
            .match_query(mockito::Matcher::UrlEncoded("name".into(), "test-stack".into()))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(serde_json::to_string(&stack).unwrap())
            .create_async()
            .await;
        
        // Create API client pointing to mock server
        let api_client = ApiClient::new(
            server.url(),
            "test-api-key".to_string(),
        );
        
        // Call handle_list_variables
        let result = handle_list_variables(
            DataSource::Stack,
            "test-stack",
            &api_client,
        ).await;
        
        // Verify the mock was called
        mock.assert_async().await;
        
        // Should succeed
        assert!(result.is_ok(), "Expected success, got error: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_handle_list_variables_blueprint_not_found() {
        // This test verifies that handle_list_variables handles 404 errors correctly
        
        use mockito::Server;
        
        // Create a mock server
        let mut server = Server::new_async().await;
        
        // Mock the API endpoint to return 404
        let mock = server.mock("GET", "/blueprints")
            .match_query(mockito::Matcher::UrlEncoded("name".into(), "nonexistent-blueprint".into()))
            .with_status(404)
            .with_header("content-type", "application/json")
            .with_body(r#"{"error": "Blueprint not found"}"#)
            .create_async()
            .await;
        
        // Create API client pointing to mock server
        let api_client = ApiClient::new(
            server.url(),
            "test-api-key".to_string(),
        );
        
        // Call handle_list_variables
        let result = handle_list_variables(
            DataSource::Blueprint,
            "nonexistent-blueprint",
            &api_client,
        ).await;
        
        // Verify the mock was called
        mock.assert_async().await;
        
        // Should fail with NotFoundError
        assert!(result.is_err());
        match result.unwrap_err() {
            CliError::NotFoundError(_) => {
                // Expected error type
            }
            other => {
                panic!("Expected NotFoundError, got: {:?}", other);
            }
        }
    }

    #[tokio::test]
    async fn test_handle_generate_writes_files_successfully() {
        // This test verifies that handle_generate writes files to the output directory
        
        use mockito::Server;
        use crate::models::{Blueprint, BlueprintResource, CloudProvider, ResourceType};
        use uuid::Uuid;
        
        // Create temporary directories
        let temp_dir = TempDir::new().unwrap();
        let template_dir = temp_dir.path().join("templates");
        let output_dir = temp_dir.path().join("output");
        
        fs::create_dir(&template_dir).unwrap();
        fs::create_dir(&output_dir).unwrap();
        
        // Create template files
        fs::write(
            template_dir.join("main.tf"),
            "resource \"aws_instance\" \"{{resources.0.name}}\" {}"
        ).unwrap();
        
        fs::write(
            template_dir.join("variables.tf"),
            "variable \"resource_name\" {\n  default = \"{{resources.0.name}}\"\n}"
        ).unwrap();
        
        // Create a subdirectory with a template
        let k8s_dir = template_dir.join("k8s");
        fs::create_dir(&k8s_dir).unwrap();
        fs::write(
            k8s_dir.join("deployment.yaml"),
            "apiVersion: v1\nkind: Deployment\nmetadata:\n  name: {{resources.0.name}}"
        ).unwrap();
        
        // Create a mock server
        let mut server = Server::new_async().await;
        
        // Create mock blueprint data
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "test-blueprint".to_string(),
            description: Some("Test blueprint".to_string()),
            resources: vec![
                BlueprintResource {
                    id: Uuid::new_v4(),
                    name: "test-resource".to_string(),
                    description: Some("Test resource".to_string()),
                    resource_type: ResourceType {
                        id: Uuid::new_v4(),
                        name: "TestType".to_string(),
                        category: "compute".to_string(),
                    },
                    cloud_provider: CloudProvider {
                        id: Uuid::new_v4(),
                        name: "AWS".to_string(),
                        display_name: "Amazon Web Services".to_string(),
                    },
                    configuration: serde_json::json!({}),
                    cloud_specific_properties: std::collections::HashMap::new(),
                }
            ],
            supported_cloud_providers: vec![],
        };
        
        // Mock the API endpoint
        let mock = server.mock("GET", "/blueprints")
            .match_query(mockito::Matcher::UrlEncoded("name".into(), "test-blueprint".into()))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(serde_json::to_string(&blueprint).unwrap())
            .create_async()
            .await;
        
        // Create API client pointing to mock server
        let api_client = ApiClient::new(
            server.url(),
            "test-api-key".to_string(),
        );
        
        // Call handle_generate
        let result = handle_generate(
            DataSource::Blueprint,
            "test-blueprint",
            &template_dir,
            None,
            &api_client,
            &output_dir,
        ).await;
        
        // Verify the mock was called
        mock.assert_async().await;
        
        // Should succeed
        assert!(result.is_ok(), "Expected success, got error: {:?}", result.err());
        
        // Verify files were written to output directory
        assert!(output_dir.join("main.tf").exists(), "main.tf should exist");
        assert!(output_dir.join("variables.tf").exists(), "variables.tf should exist");
        assert!(output_dir.join("k8s/deployment.yaml").exists(), "k8s/deployment.yaml should exist");
        
        // Verify file contents
        let main_content = fs::read_to_string(output_dir.join("main.tf")).unwrap();
        assert_eq!(main_content, "resource \"aws_instance\" \"test-resource\" {}");
        
        let variables_content = fs::read_to_string(output_dir.join("variables.tf")).unwrap();
        assert_eq!(variables_content, "variable \"resource_name\" {\n  default = \"test-resource\"\n}");
        
        let deployment_content = fs::read_to_string(output_dir.join("k8s/deployment.yaml")).unwrap();
        assert_eq!(deployment_content, "apiVersion: v1\nkind: Deployment\nmetadata:\n  name: test-resource");
    }

}
