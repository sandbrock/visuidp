//! Integration tests for end-to-end template processing
//! 
//! These tests verify the complete workflow from API data fetching
//! through template processing to file generation.

use std::fs;
use tempfile::TempDir;
use mockito::Server;
use uuid::Uuid;

// Import from the library
use idp_cli::models::{
    Blueprint, BlueprintResource, Stack, StackResource,
    CloudProvider, ResourceType,
};

/// Helper to run CLI command with proper argument order
fn run_cli_generate(
    data_source: &str,
    identifier: &str,
    template_dir: &str,
    output_dir: &str,
    api_url: &str,
    variables_file: Option<&str>,
) -> std::process::Output {
    let mut args = vec![
        "run", "--",
        "--api-url", api_url,
        "--api-key", "test-key",
        "--output-dir", output_dir,
        "generate",
        data_source,
        identifier,
        "--template-dir", template_dir,
    ];
    
    if let Some(vars_file) = variables_file {
        args.push("--variables-file");
        args.push(vars_file);
    }
    
    std::process::Command::new("cargo")
        .args(&args)
        .output()
        .expect("Failed to execute command")
}

/// Helper to run list-variables command
fn run_cli_list_variables(
    data_source: &str,
    identifier: &str,
    api_url: &str,
) -> std::process::Output {
    std::process::Command::new("cargo")
        .args(&[
            "run", "--",
            "--api-url", api_url,
            "--api-key", "test-key",
            "list-variables",
            data_source,
            identifier,
        ])
        .output()
        .expect("Failed to execute command")
}

/// Helper function to create a mock blueprint with realistic data
fn create_mock_blueprint() -> Blueprint {
    let mut cloud_specific_properties = std::collections::HashMap::new();
    cloud_specific_properties.insert("engine".to_string(), serde_json::json!("postgres"));
    cloud_specific_properties.insert("engine_version".to_string(), serde_json::json!("14.7"));
    cloud_specific_properties.insert("instance_class".to_string(), serde_json::json!("db.t3.micro"));
    cloud_specific_properties.insert("allocated_storage".to_string(), serde_json::json!(20));
    
    Blueprint {
        id: Uuid::new_v4(),
        name: "web-app-blueprint".to_string(),
        description: Some("Web application infrastructure".to_string()),
        resources: vec![
            BlueprintResource {
                id: Uuid::new_v4(),
                name: "postgres-db".to_string(),
                description: Some("PostgreSQL database".to_string()),
                resource_type: ResourceType {
                    id: Uuid::new_v4(),
                    name: "RelationalDatabaseServer".to_string(),
                    category: "database".to_string(),
                },
                cloud_provider: CloudProvider {
                    id: Uuid::new_v4(),
                    name: "AWS".to_string(),
                    display_name: "Amazon Web Services".to_string(),
                },
                configuration: serde_json::json!({}),
                cloud_specific_properties,
            }
        ],
        supported_cloud_providers: vec![],
    }
}

/// Helper function to create a mock stack with realistic data
fn create_mock_stack() -> Stack {
    let mut configuration = std::collections::HashMap::new();
    configuration.insert("image".to_string(), serde_json::json!("nginx:latest"));
    configuration.insert("port".to_string(), serde_json::json!(80));
    configuration.insert("replicas".to_string(), serde_json::json!(3));
    
    Stack {
        id: Uuid::new_v4(),
        name: "my-web-app".to_string(),
        description: Some("Production web application".to_string()),
        cloud_name: "aws-us-east-1".to_string(),
        stack_type: "RestfulApi".to_string(),
        stack_resources: vec![
            StackResource {
                id: Uuid::new_v4(),
                name: "web-container".to_string(),
                description: Some("Web application container".to_string()),
                resource_type: ResourceType {
                    id: Uuid::new_v4(),
                    name: "ContainerOrchestrator".to_string(),
                    category: "compute".to_string(),
                },
                cloud_provider: CloudProvider {
                    id: Uuid::new_v4(),
                    name: "AWS".to_string(),
                    display_name: "Amazon Web Services".to_string(),
                },
                configuration,
            }
        ],
        blueprint: None,
    }
}

#[tokio::test]
async fn test_complete_generate_flow_with_terraform_templates() {
    // Create temporary directories
    let temp_dir = TempDir::new().unwrap();
    let template_dir = temp_dir.path().join("templates");
    let output_dir = temp_dir.path().join("output");
    
    fs::create_dir(&template_dir).unwrap();
    fs::create_dir(&output_dir).unwrap();
    
    // Create Terraform templates
    fs::write(
        template_dir.join("main.tf"),
        r#"resource "aws_db_instance" "{{resources.0.name}}" {
  identifier     = "{{resources.0.name}}"
  engine         = "{{resources.0.cloud_specific_properties.engine}}"
  engine_version = "{{resources.0.cloud_specific_properties.engine_version}}"
  instance_class = "{{resources.0.cloud_specific_properties.instance_class}}"
  
  tags = {
    Name      = "{{resources.0.name}}"
    ManagedBy = "IDP"
    Blueprint = "{{blueprint.name}}"
  }
}
"#
    ).unwrap();
    
    fs::write(
        template_dir.join("variables.tf"),
        r#"variable "blueprint_name" {
  description = "Name of the blueprint"
  default     = "{{blueprint.name}}"
}
"#
    ).unwrap();
    
    // Create a mock server
    let mut server = Server::new_async().await;
    let blueprint = create_mock_blueprint();
    
    // Mock the API endpoint
    let _mock = server.mock("GET", "/blueprints")
        .match_query(mockito::Matcher::UrlEncoded("name".into(), "web-app-blueprint".into()))
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&blueprint).unwrap())
        .create_async()
        .await;
    
    // Run the CLI command
    let result = run_cli_generate(
        "blueprint",
        "web-app-blueprint",
        template_dir.to_str().unwrap(),
        output_dir.to_str().unwrap(),
        &server.url(),
        None,
    );
    
    // Verify command succeeded
    assert!(result.status.success(), 
        "Command failed with stderr: {}", 
        String::from_utf8_lossy(&result.stderr));
    
    // Verify output files exist
    assert!(output_dir.join("main.tf").exists(), "main.tf should exist");
    assert!(output_dir.join("variables.tf").exists(), "variables.tf should exist");
    
    // Verify file contents
    let main_content = fs::read_to_string(output_dir.join("main.tf")).unwrap();
    println!("Main.tf content:\n{}", main_content);
    assert!(main_content.contains("postgres-db"), "Should contain resource name");
    assert!(main_content.contains("postgres"), "Should contain engine");
    assert!(main_content.contains("14.7"), "Should contain engine version");
    assert!(main_content.contains("db.t3.micro"), "Should contain instance class");
    assert!(main_content.contains("web-app-blueprint"), "Should contain blueprint name, got: {}", main_content);
    
    let variables_content = fs::read_to_string(output_dir.join("variables.tf")).unwrap();
    println!("Variables.tf content:\n{}", variables_content);
    assert!(variables_content.contains("web-app-blueprint"), "Should contain blueprint name");
}

#[tokio::test]
async fn test_complete_generate_flow_with_kubernetes_templates() {
    // Create temporary directories
    let temp_dir = TempDir::new().unwrap();
    let template_dir = temp_dir.path().join("templates");
    let output_dir = temp_dir.path().join("output");
    
    fs::create_dir(&template_dir).unwrap();
    fs::create_dir(&output_dir).unwrap();
    
    // Create Kubernetes templates
    fs::write(
        template_dir.join("deployment.yaml"),
        r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{stack.name}}
  labels:
    app: {{stack.name}}
spec:
  replicas: {{default stack_resources.0.configuration.replicas "3"}}
  selector:
    matchLabels:
      app: {{stack.name}}
  template:
    metadata:
      labels:
        app: {{stack.name}}
    spec:
      containers:
      - name: {{stack.name}}
        image: {{stack_resources.0.configuration.image}}
        ports:
        - containerPort: {{stack_resources.0.configuration.port}}
"#
    ).unwrap();
    
    fs::write(
        template_dir.join("service.yaml"),
        r#"apiVersion: v1
kind: Service
metadata:
  name: {{stack.name}}-service
spec:
  selector:
    app: {{stack.name}}
  ports:
  - port: {{default service_port "80"}}
    targetPort: {{stack_resources.0.configuration.port}}
  type: {{default service_type "ClusterIP"}}
"#
    ).unwrap();
    
    // Create a mock server
    let mut server = Server::new_async().await;
    let stack = create_mock_stack();
    
    // Mock the API endpoint
    let _mock = server.mock("GET", "/stacks")
        .match_query(mockito::Matcher::UrlEncoded("name".into(), "my-web-app".into()))
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&stack).unwrap())
        .create_async()
        .await;
    
    // Run the CLI command
    let result = run_cli_generate(
        "stack",
        "my-web-app",
        template_dir.to_str().unwrap(),
        output_dir.to_str().unwrap(),
        &server.url(),
        None,
    );
    
    // Verify command succeeded
    assert!(result.status.success(), 
        "Command failed with stderr: {}", 
        String::from_utf8_lossy(&result.stderr));
    
    // Verify output files exist
    assert!(output_dir.join("deployment.yaml").exists(), "deployment.yaml should exist");
    assert!(output_dir.join("service.yaml").exists(), "service.yaml should exist");
    
    // Verify file contents
    let deployment_content = fs::read_to_string(output_dir.join("deployment.yaml")).unwrap();
    assert!(deployment_content.contains("my-web-app"), "Should contain stack name");
    assert!(deployment_content.contains("nginx:latest"), "Should contain image");
    assert!(deployment_content.contains("replicas: 3"), "Should contain replicas");
    assert!(deployment_content.contains("containerPort: 80"), "Should contain port");
    
    let service_content = fs::read_to_string(output_dir.join("service.yaml")).unwrap();
    assert!(service_content.contains("my-web-app-service"), "Should contain service name");
    assert!(service_content.contains("targetPort: 80"), "Should contain target port");
    assert!(service_content.contains("ClusterIP"), "Should contain default service type");
}

#[tokio::test]
async fn test_generate_flow_with_custom_variables() {
    // Create temporary directories
    let temp_dir = TempDir::new().unwrap();
    let template_dir = temp_dir.path().join("templates");
    let output_dir = temp_dir.path().join("output");
    let vars_file = temp_dir.path().join("custom-vars.yaml");
    
    fs::create_dir(&template_dir).unwrap();
    fs::create_dir(&output_dir).unwrap();
    
    // Create Kubernetes template
    fs::write(
        template_dir.join("service.yaml"),
        r#"apiVersion: v1
kind: Service
metadata:
  name: {{stack.name}}-service
spec:
  selector:
    app: {{stack.name}}
  ports:
  - port: {{default service_port "80"}}
    targetPort: {{stack_resources.0.configuration.port}}
  type: {{default service_type "ClusterIP"}}
"#
    ).unwrap();
    
    // Create custom variables file
    fs::write(
        &vars_file,
        r#"service_port: 8080
service_type: LoadBalancer
environment: production
"#
    ).unwrap();
    
    // Create a mock server
    let mut server = Server::new_async().await;
    let stack = create_mock_stack();
    
    // Mock the API endpoint
    let _mock = server.mock("GET", "/stacks")
        .match_query(mockito::Matcher::UrlEncoded("name".into(), "my-web-app".into()))
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&stack).unwrap())
        .create_async()
        .await;
    
    // Run the CLI command with custom variables
    let result = run_cli_generate(
        "stack",
        "my-web-app",
        template_dir.to_str().unwrap(),
        output_dir.to_str().unwrap(),
        &server.url(),
        Some(vars_file.to_str().unwrap()),
    );
    
    // Verify command succeeded
    assert!(result.status.success(), 
        "Command failed with stderr: {}", 
        String::from_utf8_lossy(&result.stderr));
    
    // Verify custom variables were applied
    let service_content = fs::read_to_string(output_dir.join("service.yaml")).unwrap();
    assert!(service_content.contains("port: 8080"), "Should use custom service_port");
    assert!(service_content.contains("LoadBalancer"), "Should use custom service_type");
}

#[tokio::test]
async fn test_list_variables_command_output() {
    // Create a mock server
    let mut server = Server::new_async().await;
    let blueprint = create_mock_blueprint();
    
    // Mock the API endpoint
    let _mock = server.mock("GET", "/blueprints")
        .match_query(mockito::Matcher::UrlEncoded("name".into(), "web-app-blueprint".into()))
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&blueprint).unwrap())
        .create_async()
        .await;
    
    // Run the CLI command
    let result = run_cli_list_variables(
        "blueprint",
        "web-app-blueprint",
        &server.url(),
    );
    
    // Verify command succeeded
    assert!(result.status.success(), 
        "Command failed with stderr: {}", 
        String::from_utf8_lossy(&result.stderr));
    
    // Verify output contains expected variable information
    let stdout = String::from_utf8_lossy(&result.stdout);
    assert!(stdout.contains("Blueprint Variables"), "Should show Blueprint Variables header");
    assert!(stdout.contains("blueprint"), "Should list blueprint variables");
    assert!(stdout.contains("resources"), "Should list resources variables");
    assert!(stdout.contains("Usage Examples"), "Should show usage examples");
}

#[tokio::test]
async fn test_error_scenario_missing_template_dir() {
    // Create temporary directories
    let temp_dir = TempDir::new().unwrap();
    let output_dir = temp_dir.path().join("output");
    let nonexistent_dir = temp_dir.path().join("nonexistent");
    
    fs::create_dir(&output_dir).unwrap();
    
    // Create a mock server
    let mut server = Server::new_async().await;
    let blueprint = create_mock_blueprint();
    
    // Mock the API endpoint
    let _mock = server.mock("GET", "/blueprints")
        .match_query(mockito::Matcher::UrlEncoded("name".into(), "web-app-blueprint".into()))
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&blueprint).unwrap())
        .create_async()
        .await;
    
    // Run the CLI command with nonexistent template directory
    let result = run_cli_generate(
        "blueprint",
        "web-app-blueprint",
        nonexistent_dir.to_str().unwrap(),
        output_dir.to_str().unwrap(),
        &server.url(),
        None,
    );
    
    // Verify command failed
    assert!(!result.status.success(), "Command should fail with missing template dir");
    
    // Verify error message
    let stderr = String::from_utf8_lossy(&result.stderr);
    assert!(stderr.contains("does not exist") || stderr.contains("not found"), 
        "Should show error about missing directory");
}

#[tokio::test]
async fn test_error_scenario_invalid_templates() {
    // Create temporary directories
    let temp_dir = TempDir::new().unwrap();
    let template_dir = temp_dir.path().join("templates");
    let output_dir = temp_dir.path().join("output");
    
    fs::create_dir(&template_dir).unwrap();
    fs::create_dir(&output_dir).unwrap();
    
    // Create template with invalid syntax (unclosed variable)
    fs::write(
        template_dir.join("invalid.tf"),
        "resource \"test\" \"{{unclosed_variable\" {}"
    ).unwrap();
    
    // Create a mock server
    let mut server = Server::new_async().await;
    let blueprint = create_mock_blueprint();
    
    // Mock the API endpoint
    let _mock = server.mock("GET", "/blueprints")
        .match_query(mockito::Matcher::UrlEncoded("name".into(), "web-app-blueprint".into()))
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&blueprint).unwrap())
        .create_async()
        .await;
    
    // Run the CLI command
    let result = run_cli_generate(
        "blueprint",
        "web-app-blueprint",
        template_dir.to_str().unwrap(),
        output_dir.to_str().unwrap(),
        &server.url(),
        None,
    );
    
    // Verify command failed
    assert!(!result.status.success(), "Command should fail with invalid template");
    
    // Verify error message mentions template processing
    let stderr = String::from_utf8_lossy(&result.stderr);
    assert!(stderr.contains("template") || stderr.contains("processing") || stderr.contains("error"), 
        "Should show error about template processing");
}

#[tokio::test]
async fn test_output_file_structure_matches_template_structure() {
    // Create temporary directories
    let temp_dir = TempDir::new().unwrap();
    let template_dir = temp_dir.path().join("templates");
    let output_dir = temp_dir.path().join("output");
    
    fs::create_dir(&template_dir).unwrap();
    fs::create_dir(&output_dir).unwrap();
    
    // Create nested directory structure with templates
    let terraform_dir = template_dir.join("terraform");
    let k8s_dir = template_dir.join("k8s");
    let k8s_base_dir = k8s_dir.join("base");
    
    fs::create_dir(&terraform_dir).unwrap();
    fs::create_dir(&k8s_dir).unwrap();
    fs::create_dir(&k8s_base_dir).unwrap();
    
    // Create templates in different directories
    fs::write(terraform_dir.join("main.tf"), "# {{blueprint.name}}").unwrap();
    fs::write(terraform_dir.join("variables.tf"), "# Variables").unwrap();
    fs::write(k8s_dir.join("deployment.yaml"), "# {{blueprint.name}}").unwrap();
    fs::write(k8s_base_dir.join("namespace.yaml"), "# Namespace").unwrap();
    
    // Create a mock server
    let mut server = Server::new_async().await;
    let blueprint = create_mock_blueprint();
    
    // Mock the API endpoint
    let _mock = server.mock("GET", "/blueprints")
        .match_query(mockito::Matcher::UrlEncoded("name".into(), "web-app-blueprint".into()))
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&blueprint).unwrap())
        .create_async()
        .await;
    
    // Run the CLI command
    let result = run_cli_generate(
        "blueprint",
        "web-app-blueprint",
        template_dir.to_str().unwrap(),
        output_dir.to_str().unwrap(),
        &server.url(),
        None,
    );
    
    // Verify command succeeded
    assert!(result.status.success(), 
        "Command failed with stderr: {}", 
        String::from_utf8_lossy(&result.stderr));
    
    // Verify directory structure is preserved
    assert!(output_dir.join("terraform/main.tf").exists(), 
        "terraform/main.tf should exist");
    assert!(output_dir.join("terraform/variables.tf").exists(), 
        "terraform/variables.tf should exist");
    assert!(output_dir.join("k8s/deployment.yaml").exists(), 
        "k8s/deployment.yaml should exist");
    assert!(output_dir.join("k8s/base/namespace.yaml").exists(), 
        "k8s/base/namespace.yaml should exist");
    
    // Verify file contents were processed
    let main_content = fs::read_to_string(output_dir.join("terraform/main.tf")).unwrap();
    assert!(main_content.contains("web-app-blueprint"), 
        "Should contain processed blueprint name");
    
    let deployment_content = fs::read_to_string(output_dir.join("k8s/deployment.yaml")).unwrap();
    assert!(deployment_content.contains("web-app-blueprint"), 
        "Should contain processed blueprint name");
}

#[tokio::test]
async fn test_generate_with_multiple_resources() {
    // Create temporary directories
    let temp_dir = TempDir::new().unwrap();
    let template_dir = temp_dir.path().join("templates");
    let output_dir = temp_dir.path().join("output");
    
    fs::create_dir(&template_dir).unwrap();
    fs::create_dir(&output_dir).unwrap();
    
    // Create template that loops over resources
    fs::write(
        template_dir.join("resources.tf"),
        r#"{{#each resources}}
resource "aws_resource" "{{this.name}}" {
  name = "{{this.name}}"
  type = "{{this.resource_type.name}}"
}
{{/each}}
"#
    ).unwrap();
    
    // Create a mock server
    let mut server = Server::new_async().await;
    
    // Create blueprint with multiple resources
    let mut cloud_props1 = std::collections::HashMap::new();
    cloud_props1.insert("engine".to_string(), serde_json::json!("postgres"));
    
    let mut cloud_props2 = std::collections::HashMap::new();
    cloud_props2.insert("image".to_string(), serde_json::json!("nginx"));
    
    let blueprint = Blueprint {
        id: Uuid::new_v4(),
        name: "multi-resource-blueprint".to_string(),
        description: Some("Blueprint with multiple resources".to_string()),
        resources: vec![
            BlueprintResource {
                id: Uuid::new_v4(),
                name: "database".to_string(),
                description: Some("Database resource".to_string()),
                resource_type: ResourceType {
                    id: Uuid::new_v4(),
                    name: "RelationalDatabaseServer".to_string(),
                    category: "database".to_string(),
                },
                cloud_provider: CloudProvider {
                    id: Uuid::new_v4(),
                    name: "AWS".to_string(),
                    display_name: "Amazon Web Services".to_string(),
                },
                configuration: serde_json::json!({}),
                cloud_specific_properties: cloud_props1,
            },
            BlueprintResource {
                id: Uuid::new_v4(),
                name: "web-server".to_string(),
                description: Some("Web server resource".to_string()),
                resource_type: ResourceType {
                    id: Uuid::new_v4(),
                    name: "ContainerOrchestrator".to_string(),
                    category: "compute".to_string(),
                },
                cloud_provider: CloudProvider {
                    id: Uuid::new_v4(),
                    name: "AWS".to_string(),
                    display_name: "Amazon Web Services".to_string(),
                },
                configuration: serde_json::json!({}),
                cloud_specific_properties: cloud_props2,
            }
        ],
        supported_cloud_providers: vec![],
    };
    
    // Mock the API endpoint
    let _mock = server.mock("GET", "/blueprints")
        .match_query(mockito::Matcher::UrlEncoded("name".into(), "multi-resource-blueprint".into()))
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&blueprint).unwrap())
        .create_async()
        .await;
    
    // Run the CLI command
    let result = run_cli_generate(
        "blueprint",
        "multi-resource-blueprint",
        template_dir.to_str().unwrap(),
        output_dir.to_str().unwrap(),
        &server.url(),
        None,
    );
    
    // Verify command succeeded
    assert!(result.status.success(), 
        "Command failed with stderr: {}", 
        String::from_utf8_lossy(&result.stderr));
    
    // Verify file contains both resources
    let content = fs::read_to_string(output_dir.join("resources.tf")).unwrap();
    assert!(content.contains("database"), "Should contain first resource");
    assert!(content.contains("web-server"), "Should contain second resource");
    assert!(content.contains("RelationalDatabaseServer"), "Should contain first resource type");
    assert!(content.contains("ContainerOrchestrator"), "Should contain second resource type");
}
