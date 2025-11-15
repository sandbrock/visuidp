use crate::models::{Blueprint, CloudProvider, Stack};
use crate::resource_mapper::ResourceMapper;
use std::collections::{HashMap, HashSet};

pub struct CodeGenerator {
    resource_mapper: ResourceMapper,
}

impl CodeGenerator {
    pub fn new() -> Self {
        Self {
            resource_mapper: ResourceMapper::new(),
        }
    }

    pub fn generate_from_blueprint(&self, blueprint: &Blueprint) -> GeneratedCode {
        let main_tf = self.generate_main_tf_from_blueprint(blueprint);
        let variables_tf = self.generate_variables_tf_from_blueprint(blueprint);
        let providers_tf = self.generate_providers_tf(&blueprint.supported_cloud_providers);
        let outputs_tf = self.generate_outputs_tf_from_blueprint(blueprint);

        GeneratedCode {
            main_tf,
            variables_tf,
            providers_tf,
            outputs_tf,
        }
    }

    pub fn generate_from_stack(&self, stack: &Stack) -> GeneratedCode {
        let main_tf = self.generate_main_tf_from_stack(stack);
        let variables_tf = self.generate_variables_tf_from_stack(stack);
        
        // Collect cloud providers from stack resources
        let cloud_providers: Vec<CloudProvider> = stack.stack_resources
            .iter()
            .map(|r| r.cloud_provider.clone())
            .collect();
        let providers_tf = self.generate_providers_tf(&cloud_providers);
        let outputs_tf = self.generate_outputs_tf_from_stack(stack);

        GeneratedCode {
            main_tf,
            variables_tf,
            providers_tf,
            outputs_tf,
        }
    }

    /// Generate providers.tf content from a list of cloud providers
    pub fn generate_providers_tf(&self, cloud_providers: &[CloudProvider]) -> String {
        let mut output = String::new();
        
        // Get unique cloud provider names
        let unique_providers: HashSet<&str> = cloud_providers
            .iter()
            .map(|cp| cp.name.as_str())
            .collect();
        
        // Generate terraform required_providers block
        output.push_str("terraform {\n");
        output.push_str("  required_providers {\n");
        
        for provider_name in &unique_providers {
            let (source, version) = self.get_provider_source_and_version(provider_name);
            output.push_str(&format!("    {} = {{\n", self.normalize_provider_name(provider_name)));
            output.push_str(&format!("      source  = \"{}\"\n", source));
            output.push_str(&format!("      version = \"{}\"\n", version));
            output.push_str("    }\n");
        }
        
        output.push_str("  }\n");
        output.push_str("}\n\n");
        
        // Generate provider configuration blocks
        for provider_name in &unique_providers {
            let normalized_name = self.normalize_provider_name(provider_name);
            output.push_str(&format!("provider \"{}\" {{\n", normalized_name));
            
            // Add region variable reference based on provider
            match normalized_name {
                "aws" => {
                    output.push_str("  region = var.aws_region\n");
                }
                "azurerm" => {
                    output.push_str("  features {}\n");
                }
                "google" => {
                    output.push_str("  project = var.gcp_project\n");
                    output.push_str("  region  = var.gcp_region\n");
                }
                _ => {
                    // For unknown providers, add a comment
                    output.push_str("  # Configure provider-specific settings here\n");
                }
            }
            
            output.push_str("}\n\n");
        }
        
        output
    }

    /// Normalize cloud provider name to Terraform provider name
    fn normalize_provider_name(&self, provider_name: &str) -> &str {
        match provider_name.to_uppercase().as_str() {
            "AWS" => "aws",
            "AZURE" => "azurerm",
            "GCP" => "google",
            _ => provider_name.to_lowercase().leak(), // Fallback to lowercase
        }
    }

    /// Get provider source and version for a given cloud provider
    fn get_provider_source_and_version(&self, provider_name: &str) -> (&str, &str) {
        match provider_name.to_uppercase().as_str() {
            "AWS" => ("hashicorp/aws", "~> 5.0"),
            "AZURE" => ("hashicorp/azurerm", "~> 3.0"),
            "GCP" => ("hashicorp/google", "~> 5.0"),
            _ => ("hashicorp/unknown", "~> 1.0"), // Fallback
        }
    }

    /// Generate variables.tf content from blueprint resources
    pub fn generate_variables_tf_from_blueprint(&self, blueprint: &Blueprint) -> String {
        let mut output = String::new();
        let mut variables = HashMap::new();

        // Add provider region variables based on cloud providers
        self.add_provider_region_variables(&mut variables, &blueprint.supported_cloud_providers);

        // Extract variables from blueprint resources
        for resource in &blueprint.resources {
            self.extract_resource_variables(&mut variables, &resource.name, &resource.cloud_specific_properties, &resource.description);
        }

        // Generate variable blocks
        self.format_variables(&mut output, &variables);

        output
    }

    /// Generate variables.tf content from stack resources
    pub fn generate_variables_tf_from_stack(&self, stack: &Stack) -> String {
        let mut output = String::new();
        let mut variables = HashMap::new();

        // Collect unique cloud providers from stack resources
        let cloud_providers: Vec<CloudProvider> = stack.stack_resources
            .iter()
            .map(|r| r.cloud_provider.clone())
            .collect();

        // Add provider region variables
        self.add_provider_region_variables(&mut variables, &cloud_providers);

        // Extract variables from stack resources
        for resource in &stack.stack_resources {
            self.extract_stack_resource_variables(&mut variables, &resource.name, &resource.configuration, &resource.description);
        }

        // Generate variable blocks
        self.format_variables(&mut output, &variables);

        output
    }

    /// Add provider region variables based on cloud providers
    fn add_provider_region_variables(&self, variables: &mut HashMap<String, VariableDefinition>, cloud_providers: &[CloudProvider]) {
        let unique_providers: HashSet<&str> = cloud_providers
            .iter()
            .map(|cp| cp.name.as_str())
            .collect();

        for provider_name in unique_providers {
            match provider_name.to_uppercase().as_str() {
                "AWS" => {
                    variables.insert(
                        "aws_region".to_string(),
                        VariableDefinition {
                            description: "AWS region for resource deployment".to_string(),
                            var_type: "string".to_string(),
                            default_value: Some("\"us-east-1\"".to_string()),
                        },
                    );
                }
                "AZURE" => {
                    variables.insert(
                        "azure_location".to_string(),
                        VariableDefinition {
                            description: "Azure location for resource deployment".to_string(),
                            var_type: "string".to_string(),
                            default_value: Some("\"eastus\"".to_string()),
                        },
                    );
                }
                "GCP" => {
                    variables.insert(
                        "gcp_project".to_string(),
                        VariableDefinition {
                            description: "GCP project ID".to_string(),
                            var_type: "string".to_string(),
                            default_value: None,
                        },
                    );
                    variables.insert(
                        "gcp_region".to_string(),
                        VariableDefinition {
                            description: "GCP region for resource deployment".to_string(),
                            var_type: "string".to_string(),
                            default_value: Some("\"us-central1\"".to_string()),
                        },
                    );
                }
                _ => {}
            }
        }
    }

    /// Extract variables from blueprint resource configuration
    fn extract_resource_variables(
        &self,
        variables: &mut HashMap<String, VariableDefinition>,
        resource_name: &str,
        cloud_specific_properties: &HashMap<String, serde_json::Value>,
        description: &Option<String>,
    ) {
        // Add resource identifier variable
        let identifier_var_name = format!("{}_identifier", self.sanitize_name(resource_name));
        let identifier_description = format!(
            "Identifier for {} {}",
            resource_name,
            description.as_deref().unwrap_or("resource")
        );

        variables.insert(
            identifier_var_name,
            VariableDefinition {
                description: identifier_description,
                var_type: "string".to_string(),
                default_value: Some(format!("\"{}\"", resource_name)),
            },
        );

        // Extract configurable properties from cloud_specific_properties
        for (key, value) in cloud_specific_properties {
            let var_name = format!("{}_{}", self.sanitize_name(resource_name), self.sanitize_name(key));
            
            // Determine type and default value from JSON value
            let (var_type, default_value) = self.infer_variable_type_and_default(value);
            
            variables.insert(
                var_name.clone(),
                VariableDefinition {
                    description: format!("{} for {}", key, resource_name),
                    var_type,
                    default_value,
                },
            );
        }
    }

    /// Extract variables from stack resource configuration
    fn extract_stack_resource_variables(
        &self,
        variables: &mut HashMap<String, VariableDefinition>,
        resource_name: &str,
        configuration: &HashMap<String, serde_json::Value>,
        description: &Option<String>,
    ) {
        // Add resource identifier variable
        let identifier_var_name = format!("{}_identifier", self.sanitize_name(resource_name));
        let identifier_description = format!(
            "Identifier for {} {}",
            resource_name,
            description.as_deref().unwrap_or("resource")
        );

        variables.insert(
            identifier_var_name,
            VariableDefinition {
                description: identifier_description,
                var_type: "string".to_string(),
                default_value: Some(format!("\"{}\"", resource_name)),
            },
        );

        // Extract configurable properties from configuration
        for (key, value) in configuration {
            let var_name = format!("{}_{}", self.sanitize_name(resource_name), self.sanitize_name(key));
            
            // Determine type and default value from JSON value
            let (var_type, default_value) = self.infer_variable_type_and_default(value);
            
            variables.insert(
                var_name.clone(),
                VariableDefinition {
                    description: format!("{} for {}", key, resource_name),
                    var_type,
                    default_value,
                },
            );
        }
    }

    /// Sanitize resource/property names for use in variable names
    fn sanitize_name(&self, name: &str) -> String {
        name.to_lowercase()
            .replace('-', "_")
            .replace(' ', "_")
            .replace('.', "_")
    }

    /// Infer Terraform variable type and default value from JSON value
    fn infer_variable_type_and_default(&self, value: &serde_json::Value) -> (String, Option<String>) {
        match value {
            serde_json::Value::String(s) => ("string".to_string(), Some(format!("\"{}\"", s))),
            serde_json::Value::Number(n) => {
                if n.is_f64() {
                    ("number".to_string(), Some(n.to_string()))
                } else {
                    ("number".to_string(), Some(n.to_string()))
                }
            }
            serde_json::Value::Bool(b) => ("bool".to_string(), Some(b.to_string())),
            serde_json::Value::Array(_) => ("list(string)".to_string(), None),
            serde_json::Value::Object(_) => ("map(string)".to_string(), None),
            serde_json::Value::Null => ("string".to_string(), None),
        }
    }

    /// Format variables into HCL syntax
    fn format_variables(&self, output: &mut String, variables: &HashMap<String, VariableDefinition>) {
        // Sort variable names for consistent output
        let mut var_names: Vec<&String> = variables.keys().collect();
        var_names.sort();

        for var_name in var_names {
            if let Some(var_def) = variables.get(var_name) {
                output.push_str(&format!("variable \"{}\" {{\n", var_name));
                output.push_str(&format!("  description = \"{}\"\n", var_def.description));
                output.push_str(&format!("  type        = {}\n", var_def.var_type));
                
                if let Some(default) = &var_def.default_value {
                    output.push_str(&format!("  default     = {}\n", default));
                }
                
                output.push_str("}\n\n");
            }
        }
    }

    /// Generate main.tf content from blueprint resources
    pub fn generate_main_tf_from_blueprint(&self, blueprint: &Blueprint) -> String {
        let mut output = String::new();

        for resource in &blueprint.resources {
            // Get Terraform resource type mapping
            let tf_resource = self.resource_mapper.get_terraform_resource_type(
                &resource.resource_type.name,
                &resource.cloud_provider.name,
            );

            if let Some(tf_resource) = tf_resource {
                self.generate_resource_block(
                    &mut output,
                    &resource.name,
                    tf_resource,
                    &resource.cloud_specific_properties,
                    Some(&blueprint.name),
                    None,
                );
            } else {
                // Add comment for unmapped resource types
                output.push_str(&format!(
                    "# Resource '{}' of type '{}' for provider '{}' has no mapping\n\n",
                    resource.name, resource.resource_type.name, resource.cloud_provider.name
                ));
            }
        }

        output
    }

    /// Generate main.tf content from stack resources
    pub fn generate_main_tf_from_stack(&self, stack: &Stack) -> String {
        let mut output = String::new();

        for resource in &stack.stack_resources {
            // Get Terraform resource type mapping
            let tf_resource = self.resource_mapper.get_terraform_resource_type(
                &resource.resource_type.name,
                &resource.cloud_provider.name,
            );

            if let Some(tf_resource) = tf_resource {
                self.generate_resource_block(
                    &mut output,
                    &resource.name,
                    tf_resource,
                    &resource.configuration,
                    None,
                    Some(&stack.name),
                );
            } else {
                // Add comment for unmapped resource types
                output.push_str(&format!(
                    "# Resource '{}' of type '{}' for provider '{}' has no mapping\n\n",
                    resource.name, resource.resource_type.name, resource.cloud_provider.name
                ));
            }
        }

        output
    }

    /// Generate a single resource block in HCL format
    fn generate_resource_block(
        &self,
        output: &mut String,
        resource_name: &str,
        tf_resource: &crate::resource_mapper::TerraformResourceType,
        configuration: &HashMap<String, serde_json::Value>,
        blueprint_name: Option<&str>,
        stack_name: Option<&str>,
    ) {
        let sanitized_name = self.sanitize_name(resource_name);
        
        // Generate resource block header
        output.push_str(&format!(
            "resource \"{}\" \"{}\" {{\n",
            tf_resource.resource_type, sanitized_name
        ));

        // Add identifier attribute (common pattern)
        if tf_resource.resource_type.contains("db_instance") {
            output.push_str(&format!("  identifier = var.{}_identifier\n", sanitized_name));
        } else if tf_resource.resource_type.contains("s3_bucket") {
            output.push_str(&format!("  bucket = var.{}_identifier\n", sanitized_name));
        } else if tf_resource.resource_type.contains("cluster") || tf_resource.resource_type.contains("server") {
            output.push_str(&format!("  name = var.{}_identifier\n", sanitized_name));
        }

        // Convert configuration properties to HCL attributes
        for (key, value) in configuration {
            // Check if there's an attribute mapping
            let tf_attribute = tf_resource.attribute_mappings
                .get(key)
                .map(|s| s.as_str())
                .unwrap_or(key);

            // Skip identifier-like attributes as they're handled above
            if key == "identifier" || key == "name" || key == "bucket" || key == "cluster_name" || key == "server_name" || key == "instance_name" {
                continue;
            }

            self.generate_attribute(output, tf_attribute, value, 1);
        }

        // Add tags for managed resources
        output.push_str("\n  tags = {\n");
        output.push_str(&format!("    Name      = \"{}\"\n", resource_name));
        output.push_str("    ManagedBy = \"IDP\"\n");
        
        if let Some(bp_name) = blueprint_name {
            output.push_str(&format!("    Blueprint = \"{}\"\n", bp_name));
        }
        
        if let Some(st_name) = stack_name {
            output.push_str(&format!("    Stack     = \"{}\"\n", st_name));
        }
        
        output.push_str("  }\n");

        // Close resource block
        output.push_str("}\n\n");
    }

    /// Generate an HCL attribute from a JSON value
    fn generate_attribute(&self, output: &mut String, attribute_name: &str, value: &serde_json::Value, indent_level: usize) {
        let indent = "  ".repeat(indent_level);

        match value {
            serde_json::Value::String(s) => {
                // Check if it looks like a variable reference
                if s.starts_with("var.") {
                    output.push_str(&format!("{}{}  = {}\n", indent, attribute_name, s));
                } else {
                    output.push_str(&format!("{}{}  = \"{}\"\n", indent, attribute_name, s));
                }
            }
            serde_json::Value::Number(n) => {
                output.push_str(&format!("{}{}  = {}\n", indent, attribute_name, n));
            }
            serde_json::Value::Bool(b) => {
                output.push_str(&format!("{}{}  = {}\n", indent, attribute_name, b));
            }
            serde_json::Value::Array(arr) => {
                output.push_str(&format!("{}{}  = [\n", indent, attribute_name));
                for item in arr {
                    match item {
                        serde_json::Value::String(s) => {
                            output.push_str(&format!("{}  \"{}\",\n", indent, s));
                        }
                        serde_json::Value::Number(n) => {
                            output.push_str(&format!("{}  {},\n", indent, n));
                        }
                        serde_json::Value::Bool(b) => {
                            output.push_str(&format!("{}  {},\n", indent, b));
                        }
                        serde_json::Value::Object(_) => {
                            output.push_str(&format!("{}  {{\n", indent));
                            self.generate_nested_object(output, item, indent_level + 2);
                            output.push_str(&format!("{}  }},\n", indent));
                        }
                        _ => {}
                    }
                }
                output.push_str(&format!("{}]\n", indent));
            }
            serde_json::Value::Object(obj) => {
                output.push_str(&format!("{}{}  = {{\n", indent, attribute_name));
                for (key, val) in obj {
                    self.generate_attribute(output, key, val, indent_level + 1);
                }
                output.push_str(&format!("{}}}\n", indent));
            }
            serde_json::Value::Null => {
                output.push_str(&format!("{}{}  = null\n", indent, attribute_name));
            }
        }
    }

    /// Generate nested object attributes
    fn generate_nested_object(&self, output: &mut String, obj: &serde_json::Value, indent_level: usize) {
        if let serde_json::Value::Object(map) = obj {
            for (key, value) in map {
                self.generate_attribute(output, key, value, indent_level);
            }
        }
    }

    /// Generate outputs.tf content from blueprint resources
    pub fn generate_outputs_tf_from_blueprint(&self, blueprint: &Blueprint) -> String {
        let mut output = String::new();

        for resource in &blueprint.resources {
            let sanitized_name = self.sanitize_name(&resource.name);
            
            // Get Terraform resource type to determine output attributes
            let tf_resource = self.resource_mapper.get_terraform_resource_type(
                &resource.resource_type.name,
                &resource.cloud_provider.name,
            );

            if let Some(tf_resource) = tf_resource {
                // Generate ID output
                output.push_str(&format!("output \"{}_id\" {{\n", sanitized_name));
                output.push_str(&format!("  description = \"ID of {}\"\n", resource.name));
                output.push_str(&format!("  value       = {}.{}.id\n", tf_resource.resource_type, sanitized_name));
                output.push_str("}\n\n");

                // Generate ARN output for AWS resources
                if tf_resource.provider == "aws" {
                    output.push_str(&format!("output \"{}_arn\" {{\n", sanitized_name));
                    output.push_str(&format!("  description = \"ARN of {}\"\n", resource.name));
                    output.push_str(&format!("  value       = {}.{}.arn\n", tf_resource.resource_type, sanitized_name));
                    output.push_str("}\n\n");
                }
            }
        }

        output
    }

    /// Generate outputs.tf content from stack resources
    pub fn generate_outputs_tf_from_stack(&self, stack: &Stack) -> String {
        let mut output = String::new();

        for resource in &stack.stack_resources {
            let sanitized_name = self.sanitize_name(&resource.name);
            
            // Get Terraform resource type to determine output attributes
            let tf_resource = self.resource_mapper.get_terraform_resource_type(
                &resource.resource_type.name,
                &resource.cloud_provider.name,
            );

            if let Some(tf_resource) = tf_resource {
                // Generate ID output
                output.push_str(&format!("output \"{}_id\" {{\n", sanitized_name));
                output.push_str(&format!("  description = \"ID of {}\"\n", resource.name));
                output.push_str(&format!("  value       = {}.{}.id\n", tf_resource.resource_type, sanitized_name));
                output.push_str("}\n\n");

                // Generate ARN output for AWS resources
                if tf_resource.provider == "aws" {
                    output.push_str(&format!("output \"{}_arn\" {{\n", sanitized_name));
                    output.push_str(&format!("  description = \"ARN of {}\"\n", resource.name));
                    output.push_str(&format!("  value       = {}.{}.arn\n", tf_resource.resource_type, sanitized_name));
                    output.push_str("}\n\n");
                }
            }
        }

        output
    }
}

/// Internal structure to hold variable definition details
struct VariableDefinition {
    description: String,
    var_type: String,
    default_value: Option<String>,
}

pub struct GeneratedCode {
    pub main_tf: String,
    pub variables_tf: String,
    pub providers_tf: String,
    pub outputs_tf: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn create_test_cloud_provider(name: &str, display_name: &str) -> CloudProvider {
        CloudProvider {
            id: Uuid::new_v4(),
            name: name.to_string(),
            display_name: display_name.to_string(),
        }
    }

    #[test]
    fn test_generate_providers_tf_with_aws() {
        let generator = CodeGenerator::new();
        let providers = vec![create_test_cloud_provider("AWS", "Amazon Web Services")];

        let result = generator.generate_providers_tf(&providers);

        // Verify terraform block exists
        assert!(result.contains("terraform {"));
        assert!(result.contains("required_providers {"));

        // Verify AWS provider configuration
        assert!(result.contains("aws = {"));
        assert!(result.contains("source  = \"hashicorp/aws\""));
        assert!(result.contains("version = \"~> 5.0\""));

        // Verify provider block
        assert!(result.contains("provider \"aws\" {"));
        assert!(result.contains("region = var.aws_region"));
    }

    #[test]
    fn test_generate_providers_tf_with_azure() {
        let generator = CodeGenerator::new();
        let providers = vec![create_test_cloud_provider("AZURE", "Microsoft Azure")];

        let result = generator.generate_providers_tf(&providers);

        // Verify Azure provider configuration
        assert!(result.contains("azurerm = {"));
        assert!(result.contains("source  = \"hashicorp/azurerm\""));
        assert!(result.contains("version = \"~> 3.0\""));

        // Verify provider block with features
        assert!(result.contains("provider \"azurerm\" {"));
        assert!(result.contains("features {}"));
    }

    #[test]
    fn test_generate_providers_tf_with_gcp() {
        let generator = CodeGenerator::new();
        let providers = vec![create_test_cloud_provider("GCP", "Google Cloud Platform")];

        let result = generator.generate_providers_tf(&providers);

        // Verify GCP provider configuration
        assert!(result.contains("google = {"));
        assert!(result.contains("source  = \"hashicorp/google\""));
        assert!(result.contains("version = \"~> 5.0\""));

        // Verify provider block with project and region
        assert!(result.contains("provider \"google\" {"));
        assert!(result.contains("project = var.gcp_project"));
        assert!(result.contains("region  = var.gcp_region"));
    }

    #[test]
    fn test_generate_providers_tf_with_multiple_providers() {
        let generator = CodeGenerator::new();
        let providers = vec![
            create_test_cloud_provider("AWS", "Amazon Web Services"),
            create_test_cloud_provider("AZURE", "Microsoft Azure"),
            create_test_cloud_provider("GCP", "Google Cloud Platform"),
        ];

        let result = generator.generate_providers_tf(&providers);

        // Verify all three providers are included
        assert!(result.contains("aws = {"));
        assert!(result.contains("azurerm = {"));
        assert!(result.contains("google = {"));

        // Verify all provider blocks exist
        assert!(result.contains("provider \"aws\" {"));
        assert!(result.contains("provider \"azurerm\" {"));
        assert!(result.contains("provider \"google\" {"));
    }

    #[test]
    fn test_generate_providers_tf_deduplicates_providers() {
        let generator = CodeGenerator::new();
        let providers = vec![
            create_test_cloud_provider("AWS", "Amazon Web Services"),
            create_test_cloud_provider("AWS", "Amazon Web Services"),
            create_test_cloud_provider("AWS", "Amazon Web Services"),
        ];

        let result = generator.generate_providers_tf(&providers);

        // Count occurrences of AWS provider block - should only appear once
        let aws_count = result.matches("provider \"aws\" {").count();
        assert_eq!(aws_count, 1, "AWS provider should only appear once");

        let aws_required_count = result.matches("aws = {").count();
        assert_eq!(aws_required_count, 1, "AWS in required_providers should only appear once");
    }

    #[test]
    fn test_normalize_provider_name() {
        let generator = CodeGenerator::new();

        assert_eq!(generator.normalize_provider_name("AWS"), "aws");
        assert_eq!(generator.normalize_provider_name("aws"), "aws");
        assert_eq!(generator.normalize_provider_name("AZURE"), "azurerm");
        assert_eq!(generator.normalize_provider_name("azure"), "azurerm");
        assert_eq!(generator.normalize_provider_name("GCP"), "google");
        assert_eq!(generator.normalize_provider_name("gcp"), "google");
    }

    #[test]
    fn test_get_provider_source_and_version() {
        let generator = CodeGenerator::new();

        let (source, version) = generator.get_provider_source_and_version("AWS");
        assert_eq!(source, "hashicorp/aws");
        assert_eq!(version, "~> 5.0");

        let (source, version) = generator.get_provider_source_and_version("AZURE");
        assert_eq!(source, "hashicorp/azurerm");
        assert_eq!(version, "~> 3.0");

        let (source, version) = generator.get_provider_source_and_version("GCP");
        assert_eq!(source, "hashicorp/google");
        assert_eq!(version, "~> 5.0");
    }

    #[test]
    fn test_provider_output_format() {
        let generator = CodeGenerator::new();
        let providers = vec![
            create_test_cloud_provider("AWS", "Amazon Web Services"),
        ];

        let result = generator.generate_providers_tf(&providers);
        
        // Print the output for manual verification
        println!("\n=== Generated providers.tf (AWS only) ===\n{}\n=== End ===\n", result);
        
        // Verify basic structure
        assert!(result.starts_with("terraform {"));
        assert!(result.contains("required_providers {"));
        assert!(result.contains("provider \"aws\" {"));
    }

    #[test]
    fn test_provider_output_format_multi_cloud() {
        let generator = CodeGenerator::new();
        let providers = vec![
            create_test_cloud_provider("AWS", "Amazon Web Services"),
            create_test_cloud_provider("AZURE", "Microsoft Azure"),
            create_test_cloud_provider("GCP", "Google Cloud Platform"),
        ];

        let result = generator.generate_providers_tf(&providers);
        
        // Print the output for manual verification
        println!("\n=== Generated providers.tf (Multi-cloud) ===\n{}\n=== End ===\n", result);
        
        // Verify all providers are present
        assert!(result.contains("aws = {"));
        assert!(result.contains("azurerm = {"));
        assert!(result.contains("google = {"));
    }

    // Tests for variables generation

    use crate::models::{BlueprintResource, ResourceType, StackResource};

    fn create_test_resource_type(name: &str) -> ResourceType {
        ResourceType {
            id: Uuid::new_v4(),
            name: name.to_string(),
            category: "test".to_string(),
        }
    }

    fn create_test_blueprint_resource(name: &str, cloud_provider: CloudProvider) -> BlueprintResource {
        let mut cloud_specific_properties = HashMap::new();
        cloud_specific_properties.insert("engine".to_string(), serde_json::json!("postgres"));
        cloud_specific_properties.insert("engine_version".to_string(), serde_json::json!("14.7"));
        cloud_specific_properties.insert("instance_class".to_string(), serde_json::json!("db.t3.micro"));

        BlueprintResource {
            id: Uuid::new_v4(),
            name: name.to_string(),
            description: Some("Test database".to_string()),
            resource_type: create_test_resource_type("RelationalDatabaseServer"),
            cloud_provider,
            configuration: serde_json::json!({}),
            cloud_specific_properties,
        }
    }

    fn create_test_stack_resource(name: &str, cloud_provider: CloudProvider) -> StackResource {
        let mut configuration = HashMap::new();
        configuration.insert("engine".to_string(), serde_json::json!("postgres"));
        configuration.insert("engine_version".to_string(), serde_json::json!("14.7"));
        configuration.insert("instance_class".to_string(), serde_json::json!("db.t3.micro"));

        StackResource {
            id: Uuid::new_v4(),
            name: name.to_string(),
            description: Some("Test database".to_string()),
            resource_type: create_test_resource_type("RelationalDatabaseServer"),
            cloud_provider,
            configuration,
        }
    }

    #[test]
    fn test_generate_variables_tf_from_blueprint_with_aws() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "test-blueprint".to_string(),
            description: Some("Test blueprint".to_string()),
            resources: vec![create_test_blueprint_resource("postgres-db", aws_provider.clone())],
            supported_cloud_providers: vec![aws_provider],
        };

        let result = generator.generate_variables_tf_from_blueprint(&blueprint);

        println!("\n=== Generated variables.tf (Blueprint with AWS) ===\n{}\n=== End ===\n", result);

        // Verify AWS region variable
        assert!(result.contains("variable \"aws_region\" {"));
        assert!(result.contains("description = \"AWS region for resource deployment\""));
        assert!(result.contains("type        = string"));
        assert!(result.contains("default     = \"us-east-1\""));

        // Verify resource identifier variable
        assert!(result.contains("variable \"postgres_db_identifier\" {"));
        assert!(result.contains("Identifier for postgres-db"));

        // Verify resource property variables
        assert!(result.contains("variable \"postgres_db_engine\" {"));
        assert!(result.contains("variable \"postgres_db_engine_version\" {"));
        assert!(result.contains("variable \"postgres_db_instance_class\" {"));
    }

    #[test]
    fn test_generate_variables_tf_from_blueprint_with_gcp() {
        let generator = CodeGenerator::new();
        let gcp_provider = create_test_cloud_provider("GCP", "Google Cloud Platform");
        
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "test-blueprint".to_string(),
            description: Some("Test blueprint".to_string()),
            resources: vec![create_test_blueprint_resource("postgres-db", gcp_provider.clone())],
            supported_cloud_providers: vec![gcp_provider],
        };

        let result = generator.generate_variables_tf_from_blueprint(&blueprint);

        println!("\n=== Generated variables.tf (Blueprint with GCP) ===\n{}\n=== End ===\n", result);

        // Verify GCP region and project variables
        assert!(result.contains("variable \"gcp_project\" {"));
        assert!(result.contains("description = \"GCP project ID\""));
        assert!(result.contains("variable \"gcp_region\" {"));
        assert!(result.contains("description = \"GCP region for resource deployment\""));
        assert!(result.contains("default     = \"us-central1\""));
    }

    #[test]
    fn test_generate_variables_tf_from_stack_with_azure() {
        let generator = CodeGenerator::new();
        let azure_provider = create_test_cloud_provider("AZURE", "Microsoft Azure");
        
        let stack = Stack {
            id: Uuid::new_v4(),
            name: "test-stack".to_string(),
            description: Some("Test stack".to_string()),
            cloud_name: "azure-cloud".to_string(),
            stack_type: "infrastructure".to_string(),
            stack_resources: vec![create_test_stack_resource("sql-server", azure_provider)],
            blueprint: None,
        };

        let result = generator.generate_variables_tf_from_stack(&stack);

        println!("\n=== Generated variables.tf (Stack with Azure) ===\n{}\n=== End ===\n", result);

        // Verify Azure location variable
        assert!(result.contains("variable \"azure_location\" {"));
        assert!(result.contains("description = \"Azure location for resource deployment\""));
        assert!(result.contains("default     = \"eastus\""));

        // Verify resource identifier variable
        assert!(result.contains("variable \"sql_server_identifier\" {"));
        assert!(result.contains("Identifier for sql-server"));
    }

    #[test]
    fn test_generate_variables_tf_with_multiple_resources() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "multi-resource-blueprint".to_string(),
            description: Some("Blueprint with multiple resources".to_string()),
            resources: vec![
                create_test_blueprint_resource("postgres-db", aws_provider.clone()),
                create_test_blueprint_resource("mysql-db", aws_provider.clone()),
            ],
            supported_cloud_providers: vec![aws_provider],
        };

        let result = generator.generate_variables_tf_from_blueprint(&blueprint);

        println!("\n=== Generated variables.tf (Multiple Resources) ===\n{}\n=== End ===\n", result);

        // Verify both resource identifiers exist
        assert!(result.contains("variable \"postgres_db_identifier\" {"));
        assert!(result.contains("variable \"mysql_db_identifier\" {"));

        // Verify both sets of resource properties exist
        assert!(result.contains("variable \"postgres_db_engine\" {"));
        assert!(result.contains("variable \"mysql_db_engine\" {"));
    }

    #[test]
    fn test_sanitize_name() {
        let generator = CodeGenerator::new();

        assert_eq!(generator.sanitize_name("postgres-db"), "postgres_db");
        assert_eq!(generator.sanitize_name("My Database"), "my_database");
        assert_eq!(generator.sanitize_name("test.resource"), "test_resource");
        assert_eq!(generator.sanitize_name("UPPERCASE"), "uppercase");
    }

    #[test]
    fn test_infer_variable_type_and_default() {
        let generator = CodeGenerator::new();

        // Test string
        let (var_type, default) = generator.infer_variable_type_and_default(&serde_json::json!("test"));
        assert_eq!(var_type, "string");
        assert_eq!(default, Some("\"test\"".to_string()));

        // Test number
        let (var_type, default) = generator.infer_variable_type_and_default(&serde_json::json!(42));
        assert_eq!(var_type, "number");
        assert_eq!(default, Some("42".to_string()));

        // Test boolean
        let (var_type, default) = generator.infer_variable_type_and_default(&serde_json::json!(true));
        assert_eq!(var_type, "bool");
        assert_eq!(default, Some("true".to_string()));

        // Test array
        let (var_type, default) = generator.infer_variable_type_and_default(&serde_json::json!(["a", "b"]));
        assert_eq!(var_type, "list(string)");
        assert_eq!(default, None);

        // Test object
        let (var_type, default) = generator.infer_variable_type_and_default(&serde_json::json!({"key": "value"}));
        assert_eq!(var_type, "map(string)");
        assert_eq!(default, None);
    }

    #[test]
    fn test_variables_output_format() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "format-test".to_string(),
            description: Some("Test formatting".to_string()),
            resources: vec![create_test_blueprint_resource("test-db", aws_provider.clone())],
            supported_cloud_providers: vec![aws_provider],
        };

        let result = generator.generate_variables_tf_from_blueprint(&blueprint);

        // Verify proper HCL formatting
        assert!(result.contains("variable \""));
        assert!(result.contains("description = "));
        assert!(result.contains("type        = "));
        assert!(result.contains("default     = "));
        
        // Verify blocks are properly closed
        let open_braces = result.matches('{').count();
        let close_braces = result.matches('}').count();
        assert_eq!(open_braces, close_braces, "Braces should be balanced");
    }

    #[test]
    fn test_variables_sorted_output() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "sort-test".to_string(),
            description: Some("Test sorting".to_string()),
            resources: vec![create_test_blueprint_resource("zebra-db", aws_provider.clone())],
            supported_cloud_providers: vec![aws_provider],
        };

        let result = generator.generate_variables_tf_from_blueprint(&blueprint);

        // Variables should appear in alphabetical order
        // aws_region should come before zebra_db_* variables
        let aws_region_pos = result.find("variable \"aws_region\"").unwrap();
        let zebra_db_pos = result.find("variable \"zebra_db_").unwrap();
        assert!(aws_region_pos < zebra_db_pos, "Variables should be sorted alphabetically");
    }

    // Tests for main.tf generation

    #[test]
    fn test_generate_main_tf_from_blueprint_with_aws_db() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "web-app-blueprint".to_string(),
            description: Some("Web application blueprint".to_string()),
            resources: vec![create_test_blueprint_resource("postgres-db", aws_provider.clone())],
            supported_cloud_providers: vec![aws_provider],
        };

        let result = generator.generate_main_tf_from_blueprint(&blueprint);

        println!("\n=== Generated main.tf (Blueprint with AWS DB) ===\n{}\n=== End ===\n", result);

        // Verify resource block
        assert!(result.contains("resource \"aws_db_instance\" \"postgres_db\" {"));
        
        // Verify identifier
        assert!(result.contains("identifier = var.postgres_db_identifier"));
        
        // Verify properties
        assert!(result.contains("engine"));
        assert!(result.contains("engine_version"));
        assert!(result.contains("instance_class"));
        
        // Verify tags
        assert!(result.contains("tags = {"));
        assert!(result.contains("Name      = \"postgres-db\""));
        assert!(result.contains("ManagedBy = \"IDP\""));
        assert!(result.contains("Blueprint = \"web-app-blueprint\""));
    }

    #[test]
    fn test_generate_main_tf_from_stack_with_aws_ecs() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let mut configuration = HashMap::new();
        configuration.insert("cluster_name".to_string(), serde_json::json!("my-cluster"));
        
        let ecs_resource = StackResource {
            id: Uuid::new_v4(),
            name: "app-cluster".to_string(),
            description: Some("Application cluster".to_string()),
            resource_type: create_test_resource_type("ContainerOrchestrator"),
            cloud_provider: aws_provider.clone(),
            configuration,
        };
        
        let stack = Stack {
            id: Uuid::new_v4(),
            name: "production-stack".to_string(),
            description: Some("Production stack".to_string()),
            cloud_name: "aws-prod".to_string(),
            stack_type: "infrastructure".to_string(),
            stack_resources: vec![ecs_resource],
            blueprint: None,
        };

        let result = generator.generate_main_tf_from_stack(&stack);

        println!("\n=== Generated main.tf (Stack with AWS ECS) ===\n{}\n=== End ===\n", result);

        // Verify resource block
        assert!(result.contains("resource \"aws_ecs_cluster\" \"app_cluster\" {"));
        
        // Verify name attribute
        assert!(result.contains("name = var.app_cluster_identifier"));
        
        // Verify tags
        assert!(result.contains("tags = {"));
        assert!(result.contains("Name      = \"app-cluster\""));
        assert!(result.contains("ManagedBy = \"IDP\""));
        assert!(result.contains("Stack     = \"production-stack\""));
    }

    #[test]
    fn test_generate_main_tf_with_azure_resources() {
        let generator = CodeGenerator::new();
        let azure_provider = create_test_cloud_provider("Azure", "Microsoft Azure");
        
        let mut cloud_specific_properties = HashMap::new();
        cloud_specific_properties.insert("server_name".to_string(), serde_json::json!("my-sql-server"));
        cloud_specific_properties.insert("version".to_string(), serde_json::json!("12.0"));
        cloud_specific_properties.insert("administrator_login".to_string(), serde_json::json!("sqladmin"));
        
        let azure_resource = BlueprintResource {
            id: Uuid::new_v4(),
            name: "sql-server".to_string(),
            description: Some("Azure SQL Server".to_string()),
            resource_type: create_test_resource_type("RelationalDatabaseServer"),
            cloud_provider: azure_provider.clone(),
            configuration: serde_json::json!({}),
            cloud_specific_properties,
        };
        
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "azure-blueprint".to_string(),
            description: Some("Azure blueprint".to_string()),
            resources: vec![azure_resource],
            supported_cloud_providers: vec![azure_provider],
        };

        let result = generator.generate_main_tf_from_blueprint(&blueprint);

        println!("\n=== Generated main.tf (Blueprint with Azure SQL) ===\n{}\n=== End ===\n", result);

        // Verify resource block
        assert!(result.contains("resource \"azurerm_mssql_server\" \"sql_server\" {"));
        
        // Verify properties
        assert!(result.contains("version"));
        assert!(result.contains("administrator_login"));
        
        // Verify tags
        assert!(result.contains("tags = {"));
        assert!(result.contains("Name      = \"sql-server\""));
    }

    #[test]
    fn test_generate_main_tf_with_gcp_resources() {
        let generator = CodeGenerator::new();
        let gcp_provider = create_test_cloud_provider("GCP", "Google Cloud Platform");
        
        let mut configuration = HashMap::new();
        configuration.insert("instance_name".to_string(), serde_json::json!("my-db-instance"));
        configuration.insert("database_version".to_string(), serde_json::json!("POSTGRES_14"));
        configuration.insert("tier".to_string(), serde_json::json!("db-f1-micro"));
        
        let gcp_resource = StackResource {
            id: Uuid::new_v4(),
            name: "postgres-instance".to_string(),
            description: Some("PostgreSQL instance".to_string()),
            resource_type: create_test_resource_type("RelationalDatabaseServer"),
            cloud_provider: gcp_provider.clone(),
            configuration,
        };
        
        let stack = Stack {
            id: Uuid::new_v4(),
            name: "gcp-stack".to_string(),
            description: Some("GCP stack".to_string()),
            cloud_name: "gcp-prod".to_string(),
            stack_type: "infrastructure".to_string(),
            stack_resources: vec![gcp_resource],
            blueprint: None,
        };

        let result = generator.generate_main_tf_from_stack(&stack);

        println!("\n=== Generated main.tf (Stack with GCP SQL) ===\n{}\n=== End ===\n", result);

        // Verify resource block
        assert!(result.contains("resource \"google_sql_database_instance\" \"postgres_instance\" {"));
        
        // Verify properties
        assert!(result.contains("database_version"));
        
        // Verify tags
        assert!(result.contains("tags = {"));
        assert!(result.contains("Name      = \"postgres-instance\""));
    }

    #[test]
    fn test_generate_main_tf_with_nested_objects() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let mut configuration = HashMap::new();
        configuration.insert("engine".to_string(), serde_json::json!("postgres"));
        configuration.insert("settings".to_string(), serde_json::json!({
            "tier": "db.t3.micro",
            "backup": {
                "enabled": true,
                "retention_days": 7
            }
        }));
        
        let resource = StackResource {
            id: Uuid::new_v4(),
            name: "complex-db".to_string(),
            description: Some("Database with nested config".to_string()),
            resource_type: create_test_resource_type("RelationalDatabaseServer"),
            cloud_provider: aws_provider.clone(),
            configuration,
        };
        
        let stack = Stack {
            id: Uuid::new_v4(),
            name: "test-stack".to_string(),
            description: Some("Test stack".to_string()),
            cloud_name: "aws-test".to_string(),
            stack_type: "infrastructure".to_string(),
            stack_resources: vec![resource],
            blueprint: None,
        };

        let result = generator.generate_main_tf_from_stack(&stack);

        println!("\n=== Generated main.tf (Nested Objects) ===\n{}\n=== End ===\n", result);

        // Verify nested object handling
        assert!(result.contains("settings  = {"));
        assert!(result.contains("tier"));
        assert!(result.contains("backup  = {"));
        assert!(result.contains("enabled"));
        assert!(result.contains("retention_days"));
    }

    #[test]
    fn test_generate_main_tf_with_arrays() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let mut configuration = HashMap::new();
        configuration.insert("cluster_name".to_string(), serde_json::json!("my-cluster"));
        configuration.insert("capacity_providers".to_string(), serde_json::json!(["FARGATE", "FARGATE_SPOT"]));
        
        let resource = StackResource {
            id: Uuid::new_v4(),
            name: "ecs-cluster".to_string(),
            description: Some("ECS cluster".to_string()),
            resource_type: create_test_resource_type("ContainerOrchestrator"),
            cloud_provider: aws_provider.clone(),
            configuration,
        };
        
        let stack = Stack {
            id: Uuid::new_v4(),
            name: "test-stack".to_string(),
            description: Some("Test stack".to_string()),
            cloud_name: "aws-test".to_string(),
            stack_type: "infrastructure".to_string(),
            stack_resources: vec![resource],
            blueprint: None,
        };

        let result = generator.generate_main_tf_from_stack(&stack);

        println!("\n=== Generated main.tf (Arrays) ===\n{}\n=== End ===\n", result);

        // Verify array handling
        assert!(result.contains("capacity_providers  = ["));
        assert!(result.contains("\"FARGATE\""));
        assert!(result.contains("\"FARGATE_SPOT\""));
    }

    #[test]
    fn test_generate_main_tf_with_unmapped_resource() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let mut configuration = HashMap::new();
        configuration.insert("some_property".to_string(), serde_json::json!("value"));
        
        let resource = StackResource {
            id: Uuid::new_v4(),
            name: "unknown-resource".to_string(),
            description: Some("Unknown resource type".to_string()),
            resource_type: create_test_resource_type("UnknownResourceType"),
            cloud_provider: aws_provider.clone(),
            configuration,
        };
        
        let stack = Stack {
            id: Uuid::new_v4(),
            name: "test-stack".to_string(),
            description: Some("Test stack".to_string()),
            cloud_name: "aws-test".to_string(),
            stack_type: "infrastructure".to_string(),
            stack_resources: vec![resource],
            blueprint: None,
        };

        let result = generator.generate_main_tf_from_stack(&stack);

        println!("\n=== Generated main.tf (Unmapped Resource) ===\n{}\n=== End ===\n", result);

        // Verify comment for unmapped resource
        assert!(result.contains("# Resource 'unknown-resource' of type 'UnknownResourceType' for provider 'AWS' has no mapping"));
    }

    // Tests for outputs.tf generation

    #[test]
    fn test_generate_outputs_tf_from_blueprint() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "test-blueprint".to_string(),
            description: Some("Test blueprint".to_string()),
            resources: vec![create_test_blueprint_resource("postgres-db", aws_provider.clone())],
            supported_cloud_providers: vec![aws_provider],
        };

        let result = generator.generate_outputs_tf_from_blueprint(&blueprint);

        println!("\n=== Generated outputs.tf (Blueprint) ===\n{}\n=== End ===\n", result);

        // Verify ID output
        assert!(result.contains("output \"postgres_db_id\" {"));
        assert!(result.contains("description = \"ID of postgres-db\""));
        assert!(result.contains("value       = aws_db_instance.postgres_db.id"));

        // Verify ARN output for AWS resources
        assert!(result.contains("output \"postgres_db_arn\" {"));
        assert!(result.contains("description = \"ARN of postgres-db\""));
        assert!(result.contains("value       = aws_db_instance.postgres_db.arn"));
    }

    #[test]
    fn test_generate_outputs_tf_from_stack() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let stack = Stack {
            id: Uuid::new_v4(),
            name: "test-stack".to_string(),
            description: Some("Test stack".to_string()),
            cloud_name: "aws-test".to_string(),
            stack_type: "infrastructure".to_string(),
            stack_resources: vec![create_test_stack_resource("app-db", aws_provider)],
            blueprint: None,
        };

        let result = generator.generate_outputs_tf_from_stack(&stack);

        println!("\n=== Generated outputs.tf (Stack) ===\n{}\n=== End ===\n", result);

        // Verify ID output
        assert!(result.contains("output \"app_db_id\" {"));
        assert!(result.contains("description = \"ID of app-db\""));
        assert!(result.contains("value       = aws_db_instance.app_db.id"));

        // Verify ARN output
        assert!(result.contains("output \"app_db_arn\" {"));
        assert!(result.contains("description = \"ARN of app-db\""));
        assert!(result.contains("value       = aws_db_instance.app_db.arn"));
    }

    #[test]
    fn test_generate_outputs_tf_no_arn_for_non_aws() {
        let generator = CodeGenerator::new();
        let azure_provider = create_test_cloud_provider("Azure", "Microsoft Azure");
        
        let mut cloud_specific_properties = HashMap::new();
        cloud_specific_properties.insert("server_name".to_string(), serde_json::json!("my-server"));
        
        let azure_resource = BlueprintResource {
            id: Uuid::new_v4(),
            name: "sql-server".to_string(),
            description: Some("Azure SQL Server".to_string()),
            resource_type: create_test_resource_type("RelationalDatabaseServer"),
            cloud_provider: azure_provider.clone(),
            configuration: serde_json::json!({}),
            cloud_specific_properties,
        };
        
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "azure-blueprint".to_string(),
            description: Some("Azure blueprint".to_string()),
            resources: vec![azure_resource],
            supported_cloud_providers: vec![azure_provider],
        };

        let result = generator.generate_outputs_tf_from_blueprint(&blueprint);

        println!("\n=== Generated outputs.tf (Azure - No ARN) ===\n{}\n=== End ===\n", result);

        // Verify ID output exists
        assert!(result.contains("output \"sql_server_id\" {"));
        
        // Verify ARN output does NOT exist for Azure
        assert!(!result.contains("output \"sql_server_arn\" {"));
    }

    // Integration test for complete code generation

    #[test]
    fn test_generate_from_blueprint_complete() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let blueprint = Blueprint {
            id: Uuid::new_v4(),
            name: "complete-blueprint".to_string(),
            description: Some("Complete test blueprint".to_string()),
            resources: vec![create_test_blueprint_resource("test-db", aws_provider.clone())],
            supported_cloud_providers: vec![aws_provider],
        };

        let generated = generator.generate_from_blueprint(&blueprint);

        println!("\n=== Complete Generated Code (Blueprint) ===");
        println!("\n--- main.tf ---\n{}", generated.main_tf);
        println!("\n--- variables.tf ---\n{}", generated.variables_tf);
        println!("\n--- providers.tf ---\n{}", generated.providers_tf);
        println!("\n--- outputs.tf ---\n{}", generated.outputs_tf);
        println!("\n=== End ===\n");

        // Verify all files are generated
        assert!(!generated.main_tf.is_empty());
        assert!(!generated.variables_tf.is_empty());
        assert!(!generated.providers_tf.is_empty());
        assert!(!generated.outputs_tf.is_empty());

        // Verify main.tf contains resource
        assert!(generated.main_tf.contains("resource \"aws_db_instance\""));

        // Verify variables.tf contains variables
        assert!(generated.variables_tf.contains("variable \"aws_region\""));
        assert!(generated.variables_tf.contains("variable \"test_db_identifier\""));

        // Verify providers.tf contains provider
        assert!(generated.providers_tf.contains("provider \"aws\""));

        // Verify outputs.tf contains outputs
        assert!(generated.outputs_tf.contains("output \"test_db_id\""));
    }

    #[test]
    fn test_generate_from_stack_complete() {
        let generator = CodeGenerator::new();
        let aws_provider = create_test_cloud_provider("AWS", "Amazon Web Services");
        
        let stack = Stack {
            id: Uuid::new_v4(),
            name: "complete-stack".to_string(),
            description: Some("Complete test stack".to_string()),
            cloud_name: "aws-prod".to_string(),
            stack_type: "infrastructure".to_string(),
            stack_resources: vec![create_test_stack_resource("prod-db", aws_provider)],
            blueprint: None,
        };

        let generated = generator.generate_from_stack(&stack);

        println!("\n=== Complete Generated Code (Stack) ===");
        println!("\n--- main.tf ---\n{}", generated.main_tf);
        println!("\n--- variables.tf ---\n{}", generated.variables_tf);
        println!("\n--- providers.tf ---\n{}", generated.providers_tf);
        println!("\n--- outputs.tf ---\n{}", generated.outputs_tf);
        println!("\n=== End ===\n");

        // Verify all files are generated
        assert!(!generated.main_tf.is_empty());
        assert!(!generated.variables_tf.is_empty());
        assert!(!generated.providers_tf.is_empty());
        assert!(!generated.outputs_tf.is_empty());

        // Verify main.tf contains resource with stack tag
        assert!(generated.main_tf.contains("resource \"aws_db_instance\""));
        assert!(generated.main_tf.contains("Stack     = \"complete-stack\""));

        // Verify variables.tf contains variables
        assert!(generated.variables_tf.contains("variable \"aws_region\""));
        assert!(generated.variables_tf.contains("variable \"prod_db_identifier\""));

        // Verify providers.tf contains provider
        assert!(generated.providers_tf.contains("provider \"aws\""));

        // Verify outputs.tf contains outputs
        assert!(generated.outputs_tf.contains("output \"prod_db_id\""));
    }
}
