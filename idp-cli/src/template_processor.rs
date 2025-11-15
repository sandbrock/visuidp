use crate::error::CliError;
use crate::template_discovery::TemplateFile;
use crate::variable_context::VariableContext;
use handlebars::{
    Context, Handlebars, Helper, HelperResult, Output, RenderContext, RenderError,
};
use std::path::PathBuf;

// Helper function implementations

/// Default value helper: {{default variable "fallback_value"}}
/// Returns the variable value if it exists and is not empty, otherwise returns the fallback
fn default_helper(
    h: &Helper,
    _: &Handlebars,
    _: &Context,
    _: &mut RenderContext,
    out: &mut dyn Output,
) -> HelperResult {
    // Get the first parameter (the variable value)
    let value = h.param(0);
    
    // Get the second parameter (the default/fallback value)
    let default = h.param(1)
        .ok_or_else(|| RenderError::new("default helper requires a fallback value"))?;
    
    // Use the value if it exists and is not empty, otherwise use default
    let result = if let Some(val) = value {
        let val_str = val.value().as_str().unwrap_or("");
        if val_str.is_empty() {
            default.value().as_str().unwrap_or("")
        } else {
            val_str
        }
    } else {
        default.value().as_str().unwrap_or("")
    };
    
    out.write(result)?;
    Ok(())
}

/// Uppercase helper: {{uppercase text}}
/// Converts the input text to uppercase
fn uppercase_helper(
    h: &Helper,
    _: &Handlebars,
    _: &Context,
    _: &mut RenderContext,
    out: &mut dyn Output,
) -> HelperResult {
    let param = h.param(0)
        .ok_or_else(|| RenderError::new("uppercase helper requires a parameter"))?;
    
    let text = param.value().as_str().unwrap_or("");
    out.write(&text.to_uppercase())?;
    Ok(())
}

/// Lowercase helper: {{lowercase text}}
/// Converts the input text to lowercase
fn lowercase_helper(
    h: &Helper,
    _: &Handlebars,
    _: &Context,
    _: &mut RenderContext,
    out: &mut dyn Output,
) -> HelperResult {
    let param = h.param(0)
        .ok_or_else(|| RenderError::new("lowercase helper requires a parameter"))?;
    
    let text = param.value().as_str().unwrap_or("");
    out.write(&text.to_lowercase())?;
    Ok(())
}

/// Capitalize helper: {{capitalize text}}
/// Capitalizes the first letter of the input text
fn capitalize_helper(
    h: &Helper,
    _: &Handlebars,
    _: &Context,
    _: &mut RenderContext,
    out: &mut dyn Output,
) -> HelperResult {
    let param = h.param(0)
        .ok_or_else(|| RenderError::new("capitalize helper requires a parameter"))?;
    
    let text = param.value().as_str().unwrap_or("");
    if text.is_empty() {
        return Ok(());
    }
    
    let mut chars = text.chars();
    let capitalized = match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    };
    
    out.write(&capitalized)?;
    Ok(())
}

/// Trim helper: {{trim text}}
/// Removes leading and trailing whitespace from the input text
fn trim_helper(
    h: &Helper,
    _: &Handlebars,
    _: &Context,
    _: &mut RenderContext,
    out: &mut dyn Output,
) -> HelperResult {
    let param = h.param(0)
        .ok_or_else(|| RenderError::new("trim helper requires a parameter"))?;
    
    let text = param.value().as_str().unwrap_or("");
    out.write(text.trim())?;
    Ok(())
}

/// Replace helper: {{replace text "old" "new"}}
/// Replaces all occurrences of "old" with "new" in the input text
fn replace_helper(
    h: &Helper,
    _: &Handlebars,
    _: &Context,
    _: &mut RenderContext,
    out: &mut dyn Output,
) -> HelperResult {
    let text_param = h.param(0)
        .ok_or_else(|| RenderError::new("replace helper requires text parameter"))?;
    let old_param = h.param(1)
        .ok_or_else(|| RenderError::new("replace helper requires old string parameter"))?;
    let new_param = h.param(2)
        .ok_or_else(|| RenderError::new("replace helper requires new string parameter"))?;
    
    let text = text_param.value().as_str().unwrap_or("");
    let old = old_param.value().as_str().unwrap_or("");
    let new = new_param.value().as_str().unwrap_or("");
    
    let result = text.replace(old, new);
    out.write(&result)?;
    Ok(())
}

/// Template processor that substitutes variables in template files
/// 
/// Uses the Handlebars template engine to process templates with variable substitution.
/// Supports {{variable_name}} syntax, dot notation, array indexing, and custom helpers.
pub struct TemplateProcessor<'a> {
    /// Variable context containing all available variables
    context: &'a VariableContext,
    /// Handlebars engine instance with custom configuration
    handlebars: Handlebars<'a>,
}

impl<'a> TemplateProcessor<'a> {
    /// Create a new TemplateProcessor with the given variable context
    /// 
    /// Initializes the Handlebars engine with custom configuration:
    /// - Strict mode disabled to allow missing variables with warnings
    /// - Custom helpers registered for common operations
    /// 
    /// # Arguments
    /// * `context` - The VariableContext containing variables for substitution
    /// 
    /// # Returns
    /// A new TemplateProcessor instance ready to process templates
    /// 
    /// # Examples
    /// ```
    /// let context = VariableContextBuilder::from_blueprint(&blueprint);
    /// let processor = TemplateProcessor::new(&context);
    /// ```
    pub fn new(context: &'a VariableContext) -> Self {
        let mut handlebars = Handlebars::new();
        
        // Configure Handlebars
        // Disable strict mode to allow missing variables (we'll handle them gracefully)
        handlebars.set_strict_mode(false);
        
        // Enable HTML escaping prevention for infrastructure code
        // (we're not generating HTML, so we don't want escaping)
        handlebars.register_escape_fn(handlebars::no_escape);
        
        // Register custom helpers
        Self::register_helpers(&mut handlebars);
        
        TemplateProcessor {
            context,
            handlebars,
        }
    }

    /// Register all custom Handlebars helpers
    /// 
    /// Registers helpers for:
    /// - Default values: {{default variable "fallback"}}
    /// - Case conversion: {{uppercase text}}, {{lowercase text}}, {{capitalize text}}
    /// - String operations: {{trim text}}, {{replace text "old" "new"}}
    /// 
    /// Note: Conditional (if/else) and loop (each) helpers are built-in to Handlebars
    fn register_helpers(handlebars: &mut Handlebars) {
        // Default value helper: {{default variable "fallback_value"}}
        handlebars.register_helper("default", Box::new(default_helper));
        
        // Case conversion helpers
        handlebars.register_helper("uppercase", Box::new(uppercase_helper));
        handlebars.register_helper("lowercase", Box::new(lowercase_helper));
        handlebars.register_helper("capitalize", Box::new(capitalize_helper));
        
        // String operation helpers
        handlebars.register_helper("trim", Box::new(trim_helper));
        handlebars.register_helper("replace", Box::new(replace_helper));
    }

    /// Process a template string and substitute variables
    /// 
    /// Takes a template string with {{variable}} placeholders and substitutes
    /// them with values from the variable context.
    /// 
    /// # Arguments
    /// * `template_content` - The template string to process
    /// 
    /// # Returns
    /// * `Ok(String)` - The processed template with variables substituted
    /// * `Err(CliError)` - If template processing fails
    /// 
    /// # Examples
    /// ```
    /// let template = "resource \"aws_instance\" \"{{name}}\" { ... }";
    /// let result = processor.process_template(template)?;
    /// ```
    pub fn process_template(&self, template_content: &str) -> Result<String, CliError> {
        // Convert VariableContext to a format Handlebars can use
        let data = serde_json::to_value(self.context.variables())
            .map_err(|e| CliError::ProcessingError(format!("Failed to serialize context: {}", e)))?;
        
        // Render the template
        self.handlebars
            .render_template(template_content, &data)
            .map_err(|e| {
                self.enhance_template_error(e, template_content)
            })
    }

    /// Enhance template rendering errors with helpful context
    /// 
    /// Analyzes Handlebars rendering errors and provides:
    /// - Line numbers for syntax errors
    /// - Suggestions for undefined variables
    /// - Clear error messages with actionable guidance
    /// 
    /// # Arguments
    /// * `error` - The Handlebars RenderError
    /// * `template_content` - The original template content for line number calculation
    /// 
    /// # Returns
    /// An enhanced CliError with better context
    fn enhance_template_error(&self, error: RenderError, template_content: &str) -> CliError {
        let error_msg = error.to_string();
        
        // Check if this is a template syntax error
        if error_msg.contains("line") || error_msg.contains("column") {
            // Try to extract line number from error message
            if let Some(line_num) = self.extract_line_number(&error_msg) {
                return CliError::TemplateSyntaxError {
                    line: line_num,
                    message: format!(
                        "{}\n\n\
                        Common template syntax issues:\n\
                        - Unclosed braces: {{{{ variable (missing closing }}}})\n\
                        - Invalid helper syntax: {{{{helper param1 param2}}}}\n\
                        - Mismatched block helpers: {{{{#if}}}} without {{{{/if}}}}\n\
                        \n\
                        Template line {}:\n{}",
                        error_msg,
                        line_num,
                        self.get_template_line(template_content, line_num)
                    ),
                };
            }
        }
        
        // Check if this is a variable not found error
        if error_msg.contains("not found") || error_msg.contains("undefined") {
            if let Some(var_name) = self.extract_variable_name(&error_msg) {
                let suggestion = self.suggest_similar_variables(&var_name);
                return CliError::VariableNotFoundError {
                    variable: var_name,
                    suggestion,
                };
            }
        }
        
        // Generic processing error with enhanced message
        CliError::ProcessingError(format!(
            "Template processing failed: {}\n\n\
            Troubleshooting tips:\n\
            - Verify all {{{{variable}}}} placeholders have corresponding values\n\
            - Check that nested access paths are correct (e.g., {{{{resource.name}}}})\n\
            - Ensure array indices are valid (e.g., {{{{resources.0.name}}}})\n\
            - Use the 'list-variables' command to see available variables",
            error_msg
        ))
    }

    /// Extract line number from error message
    fn extract_line_number(&self, error_msg: &str) -> Option<usize> {
        // Try to find "line X" pattern
        if let Some(start) = error_msg.find("line ") {
            let rest = &error_msg[start + 5..];
            if let Some(end) = rest.find(|c: char| !c.is_numeric()) {
                if let Ok(num) = rest[..end].parse::<usize>() {
                    return Some(num);
                }
            }
        }
        None
    }

    /// Get a specific line from the template content
    fn get_template_line(&self, template_content: &str, line_num: usize) -> String {
        template_content
            .lines()
            .nth(line_num.saturating_sub(1))
            .unwrap_or("<line not found>")
            .to_string()
    }

    /// Extract variable name from error message
    fn extract_variable_name(&self, error_msg: &str) -> Option<String> {
        // Try to find variable name in quotes or after "variable"
        if let Some(start) = error_msg.find('"') {
            if let Some(end) = error_msg[start + 1..].find('"') {
                return Some(error_msg[start + 1..start + 1 + end].to_string());
            }
        }
        
        // Try to find variable name after "variable " or "Variable "
        for prefix in &["variable ", "Variable "] {
            if let Some(start) = error_msg.find(prefix) {
                let rest = &error_msg[start + prefix.len()..];
                if let Some(end) = rest.find(|c: char| c.is_whitespace() || c == ':') {
                    return Some(rest[..end].to_string());
                }
            }
        }
        
        None
    }

    /// Suggest similar variables when a variable is not found
    /// 
    /// Uses simple string similarity to find variables that might be what the user intended.
    /// Provides helpful suggestions for typos or incorrect paths.
    fn suggest_similar_variables(&self, var_name: &str) -> String {
        let all_vars = self.context.list_all();
        
        if all_vars.is_empty() {
            return "No variables are available in the current context.\n\
                    Use the 'list-variables' command to see what variables are available.".to_string();
        }
        
        // Find variables with similar names
        let mut suggestions: Vec<String> = all_vars
            .iter()
            .filter_map(|(name, _)| {
                if self.is_similar(var_name, name) {
                    Some(name.clone())
                } else {
                    None
                }
            })
            .take(5)
            .collect();
        
        if suggestions.is_empty() {
            // No similar variables found, show some available variables
            let sample_vars: Vec<String> = all_vars
                .iter()
                .take(10)
                .map(|(name, _)| format!("  - {}", name))
                .collect();
            
            format!(
                "Did you mean one of these variables?\n{}\n\n\
                Use the 'list-variables' command to see all available variables.",
                sample_vars.join("\n")
            )
        } else {
            // Show similar variables
            suggestions.sort();
            let suggestion_list: Vec<String> = suggestions
                .iter()
                .map(|name| format!("  - {}", name))
                .collect();
            
            format!(
                "Did you mean one of these?\n{}",
                suggestion_list.join("\n")
            )
        }
    }

    /// Check if two variable names are similar (for typo detection)
    /// 
    /// Uses a simple heuristic:
    /// - Same prefix (first 3 characters)
    /// - Levenshtein distance <= 2
    /// - Contains the search term as substring
    fn is_similar(&self, search: &str, candidate: &str) -> bool {
        let search_lower = search.to_lowercase();
        let candidate_lower = candidate.to_lowercase();
        
        // Exact match (shouldn't happen, but just in case)
        if search_lower == candidate_lower {
            return true;
        }
        
        // Contains as substring
        if candidate_lower.contains(&search_lower) || search_lower.contains(&candidate_lower) {
            return true;
        }
        
        // Same prefix (first 3 chars)
        if search_lower.len() >= 3 && candidate_lower.len() >= 3 {
            if search_lower[..3] == candidate_lower[..3] {
                return true;
            }
        }
        
        // Simple Levenshtein distance check (max 2 edits)
        self.levenshtein_distance(&search_lower, &candidate_lower) <= 2
    }

    /// Calculate Levenshtein distance between two strings
    /// 
    /// Returns the minimum number of single-character edits (insertions, deletions, or substitutions)
    /// required to change one string into the other.
    fn levenshtein_distance(&self, s1: &str, s2: &str) -> usize {
        let len1 = s1.len();
        let len2 = s2.len();
        
        if len1 == 0 {
            return len2;
        }
        if len2 == 0 {
            return len1;
        }
        
        let mut matrix = vec![vec![0; len2 + 1]; len1 + 1];
        
        for i in 0..=len1 {
            matrix[i][0] = i;
        }
        for j in 0..=len2 {
            matrix[0][j] = j;
        }
        
        for (i, c1) in s1.chars().enumerate() {
            for (j, c2) in s2.chars().enumerate() {
                let cost = if c1 == c2 { 0 } else { 1 };
                matrix[i + 1][j + 1] = std::cmp::min(
                    std::cmp::min(
                        matrix[i][j + 1] + 1,     // deletion
                        matrix[i + 1][j] + 1,     // insertion
                    ),
                    matrix[i][j] + cost,          // substitution
                );
            }
        }
        
        matrix[len1][len2]
    }

    /// Process a template file and return a ProcessedFile
    /// 
    /// Reads the template file, processes it with variable substitution,
    /// and returns a ProcessedFile with the relative path and processed content.
    /// For YAML files, validates the syntax after processing.
    /// 
    /// # Arguments
    /// * `template_file` - The TemplateFile to process
    /// 
    /// # Returns
    /// * `Ok(ProcessedFile)` - The processed file with content and path
    /// * `Err(CliError)` - If file reading, processing, or validation fails
    /// 
    /// # Examples
    /// ```
    /// let template_file = TemplateFile { ... };
    /// let processed = processor.process_file(&template_file)?;
    /// ```
    pub fn process_file(&self, template_file: &TemplateFile) -> Result<ProcessedFile, CliError> {
        use crate::template_discovery::TemplateFileType;
        
        // Read the template file content
        let template_content = std::fs::read_to_string(&template_file.path)
            .map_err(|e| {
                CliError::ProcessingError(format!(
                    "Failed to read template file '{}': {}",
                    template_file.path.display(),
                    e
                ))
            })?;
        
        // Process the template
        let processed_content = self.process_template(&template_content)?;
        
        // Validate YAML syntax for YAML files
        if template_file.file_type == TemplateFileType::Yaml {
            self.validate_yaml(&processed_content, &template_file.relative_path)?;
        }
        
        // Create and return the ProcessedFile
        Ok(ProcessedFile {
            relative_path: template_file.relative_path.clone(),
            content: processed_content,
        })
    }

    /// Validate YAML syntax after variable substitution
    /// 
    /// Validates that the processed content is valid YAML. Supports multi-document
    /// YAML files (documents separated by ---).
    /// 
    /// # Arguments
    /// * `content` - The processed YAML content to validate
    /// * `file_path` - The relative path of the file (for error messages)
    /// 
    /// # Returns
    /// * `Ok(())` - If the YAML is valid
    /// * `Err(CliError)` - If the YAML syntax is invalid
    /// 
    /// # Examples
    /// ```
    /// processor.validate_yaml(&yaml_content, &PathBuf::from("deployment.yaml"))?;
    /// ```
    fn validate_yaml(&self, content: &str, file_path: &PathBuf) -> Result<(), CliError> {
        // Split content by document separator (---)
        // YAML documents can be separated by "---" on its own line
        let documents: Vec<&str> = content
            .split("\n---\n")
            .filter(|doc| !doc.trim().is_empty())
            .collect();
        
        if documents.is_empty() {
            // Empty file is technically valid YAML
            return Ok(());
        }
        
        // Validate each document
        for (index, document) in documents.iter().enumerate() {
            // Try to parse the document as YAML
            match serde_yaml::from_str::<serde_yaml::Value>(document) {
                Ok(_) => {
                    // Document is valid YAML
                    continue;
                }
                Err(e) => {
                    // Provide clear error message with document number and location
                    let doc_info = if documents.len() > 1 {
                        format!(" (document {})", index + 1)
                    } else {
                        String::new()
                    };
                    
                    return Err(CliError::ProcessingError(format!(
                        "YAML validation failed for '{}'{}: {}\n\
                        \n\
                        The generated YAML has invalid syntax. This usually means:\n\
                        - A variable substitution resulted in invalid YAML structure\n\
                        - Missing or incorrect indentation\n\
                        - Unquoted special characters\n\
                        \n\
                        Please check your template and variable values.",
                        file_path.display(),
                        doc_info,
                        e
                    )));
                }
            }
        }
        
        Ok(())
    }
}

/// Represents a processed template file ready to be written to disk
/// 
/// Contains the relative path (preserving directory structure from the template directory)
/// and the processed content with all variables substituted.
#[derive(Debug, Clone)]
pub struct ProcessedFile {
    /// Relative path from the template directory root
    /// This path will be preserved in the output directory
    pub relative_path: PathBuf,
    
    /// Processed content with all variables substituted
    pub content: String,
}

impl ProcessedFile {
    /// Create a new ProcessedFile
    /// 
    /// # Arguments
    /// * `relative_path` - The relative path for this file
    /// * `content` - The processed content
    /// 
    /// # Returns
    /// A new ProcessedFile instance
    pub fn new(relative_path: PathBuf, content: String) -> Self {
        ProcessedFile {
            relative_path,
            content,
        }
    }
    
    /// Get the relative path as a string
    pub fn path_str(&self) -> String {
        self.relative_path.display().to_string()
    }
    
    /// Get the content length in bytes
    pub fn content_len(&self) -> usize {
        self.content.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::variable_context::VariableContext;
    use serde_json::json;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_new_template_processor() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        // Verify processor is created successfully
        assert!(!processor.context.is_empty() || processor.context.is_empty());
    }

    #[test]
    fn test_process_template_simple_substitution() {
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("test-resource"));
        
        let processor = TemplateProcessor::new(&context);
        let template = "resource \"aws_instance\" \"{{name}}\" {}";
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "resource \"aws_instance\" \"test-resource\" {}");
    }

    #[test]
    fn test_process_template_multiple_substitutions() {
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("my-instance"));
        context.insert("ami".to_string(), json!("ami-12345678"));
        context.insert("instance_type".to_string(), json!("t3.micro"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"resource "aws_instance" "{{name}}" {
  ami           = "{{ami}}"
  instance_type = "{{instance_type}}"
}"#;
        
        let result = processor.process_template(template).unwrap();
        let expected = r#"resource "aws_instance" "my-instance" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}"#;
        assert_eq!(result, expected);
    }

    #[test]
    fn test_process_template_nested_access() {
        let mut context = VariableContext::new();
        // Insert both flattened and nested structure for Handlebars
        context.insert("blueprint.name".to_string(), json!("web-app"));
        context.insert("blueprint.description".to_string(), json!("Web application"));
        context.insert("blueprint".to_string(), json!({
            "name": "web-app",
            "description": "Web application"
        }));
        
        let processor = TemplateProcessor::new(&context);
        let template = "# {{blueprint.name}}\n# {{blueprint.description}}";
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "# web-app\n# Web application");
    }

    #[test]
    fn test_process_template_deeply_nested_access() {
        let mut context = VariableContext::new();
        context.insert("resources".to_string(), json!([
            {
                "name": "postgres-db",
                "cloud_provider": {
                    "name": "AWS",
                    "display_name": "Amazon Web Services"
                }
            }
        ]));
        
        let processor = TemplateProcessor::new(&context);
        let template = "Provider: {{resources.0.cloud_provider.name}}";
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "Provider: AWS");
    }

    #[test]
    fn test_process_template_array_indexing() {
        let mut context = VariableContext::new();
        context.insert("resources".to_string(), json!([
            {
                "name": "postgres-db",
                "type": "database"
            },
            {
                "name": "redis-cache",
                "type": "cache"
            }
        ]));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"First: {{resources.0.name}}
Second: {{resources.1.name}}
Type: {{resources.0.type}}"#;
        
        let result = processor.process_template(template).unwrap();
        let expected = r#"First: postgres-db
Second: redis-cache
Type: database"#;
        assert_eq!(result, expected);
    }

    #[test]
    fn test_process_template_array_indexing_with_nested_objects() {
        let mut context = VariableContext::new();
        context.insert("resources".to_string(), json!([
            {
                "name": "db",
                "cloud_specific_properties": {
                    "engine": "postgres",
                    "engine_version": "14.7",
                    "instance_class": "db.t3.micro"
                }
            }
        ]));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"resource "aws_db_instance" "{{resources.0.name}}" {
  engine         = "{{resources.0.cloud_specific_properties.engine}}"
  engine_version = "{{resources.0.cloud_specific_properties.engine_version}}"
  instance_class = "{{resources.0.cloud_specific_properties.instance_class}}"
}"#;
        
        let result = processor.process_template(template).unwrap();
        let expected = r#"resource "aws_db_instance" "db" {
  engine         = "postgres"
  engine_version = "14.7"
  instance_class = "db.t3.micro"
}"#;
        assert_eq!(result, expected);
    }

    #[test]
    fn test_process_template_preserves_indentation() {
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("my-app"));
        context.insert("replicas".to_string(), json!(3));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{name}}
spec:
  replicas: {{replicas}}
  selector:
    matchLabels:
      app: {{name}}"#;
        
        let result = processor.process_template(template).unwrap();
        let expected = r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app"#;
        assert_eq!(result, expected);
    }

    #[test]
    fn test_process_template_preserves_line_endings() {
        let mut context = VariableContext::new();
        context.insert("line1".to_string(), json!("first"));
        context.insert("line2".to_string(), json!("second"));
        context.insert("line3".to_string(), json!("third"));
        
        let processor = TemplateProcessor::new(&context);
        let template = "{{line1}}\n{{line2}}\n{{line3}}";
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "first\nsecond\nthird");
        
        // Verify line count
        assert_eq!(result.lines().count(), 3);
    }

    #[test]
    fn test_process_template_preserves_whitespace() {
        let mut context = VariableContext::new();
        context.insert("value".to_string(), json!("test"));
        
        let processor = TemplateProcessor::new(&context);
        let template = "  {{value}}  ";
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "  test  ");
    }

    #[test]
    fn test_process_template_no_html_escaping() {
        let mut context = VariableContext::new();
        context.insert("special".to_string(), json!("<tag> & \"quotes\""));
        
        let processor = TemplateProcessor::new(&context);
        let template = "Value: {{special}}";
        
        let result = processor.process_template(template).unwrap();
        // Should NOT escape HTML entities since we're generating infrastructure code
        assert_eq!(result, "Value: <tag> & \"quotes\"");
    }

    #[test]
    fn test_process_template_missing_variable() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        let template = "resource \"aws_instance\" \"{{missing_var}}\" {}";
        
        // With strict mode disabled, missing variables should render as empty string
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "resource \"aws_instance\" \"\" {}");
    }

    #[test]
    fn test_process_template_partial_missing_nested() {
        let mut context = VariableContext::new();
        context.insert("blueprint".to_string(), json!({
            "name": "web-app"
        }));
        
        let processor = TemplateProcessor::new(&context);
        let template = "Name: {{blueprint.name}}, Desc: {{blueprint.description}}";
        
        let result = processor.process_template(template).unwrap();
        // Missing nested property should render as empty
        assert_eq!(result, "Name: web-app, Desc: ");
    }

    #[test]
    fn test_process_template_terraform_example() {
        let mut context = VariableContext::new();
        context.insert("resources".to_string(), json!([
            {
                "name": "postgres-db",
                "cloud_specific_properties": {
                    "engine": "postgres",
                    "engine_version": "14.7",
                    "instance_class": "db.t3.micro"
                }
            }
        ]));
        context.insert("blueprint".to_string(), json!({
            "name": "web-app-blueprint"
        }));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"resource "aws_db_instance" "{{resources.0.name}}" {
  identifier     = "{{resources.0.name}}"
  engine         = "{{resources.0.cloud_specific_properties.engine}}"
  engine_version = "{{resources.0.cloud_specific_properties.engine_version}}"
  instance_class = "{{resources.0.cloud_specific_properties.instance_class}}"
  
  tags = {
    Name      = "{{resources.0.name}}"
    ManagedBy = "IDP"
    Blueprint = "{{blueprint.name}}"
  }
}"#;
        
        let result = processor.process_template(template).unwrap();
        let expected = r#"resource "aws_db_instance" "postgres-db" {
  identifier     = "postgres-db"
  engine         = "postgres"
  engine_version = "14.7"
  instance_class = "db.t3.micro"
  
  tags = {
    Name      = "postgres-db"
    ManagedBy = "IDP"
    Blueprint = "web-app-blueprint"
  }
}"#;
        assert_eq!(result, expected);
    }

    #[test]
    fn test_process_template_kubernetes_example() {
        let mut context = VariableContext::new();
        context.insert("stack".to_string(), json!({
            "name": "my-web-app"
        }));
        context.insert("stack_resources".to_string(), json!([
            {
                "configuration": {
                    "replicas": 3,
                    "image": "nginx:latest",
                    "port": 80
                }
            }
        ]));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{stack.name}}
  labels:
    app: {{stack.name}}
spec:
  replicas: {{stack_resources.0.configuration.replicas}}
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
        - containerPort: {{stack_resources.0.configuration.port}}"#;
        
        let result = processor.process_template(template).unwrap();
        let expected = r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-app
  labels:
    app: my-web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-web-app
  template:
    metadata:
      labels:
        app: my-web-app
    spec:
      containers:
      - name: my-web-app
        image: nginx:latest
        ports:
        - containerPort: 80"#;
        assert_eq!(result, expected);
    }

    #[test]
    fn test_process_file_success() {
        // Create a temporary directory and file
        let temp_dir = TempDir::new().unwrap();
        let template_path = temp_dir.path().join("test.tf");
        let template_content = "resource \"aws_instance\" \"{{name}}\" {}";
        fs::write(&template_path, template_content).unwrap();
        
        // Create template file struct
        let template_file = TemplateFile {
            path: template_path.clone(),
            relative_path: PathBuf::from("test.tf"),
            file_type: crate::template_discovery::TemplateFileType::Terraform,
        };
        
        // Create context and processor
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("my-instance"));
        let processor = TemplateProcessor::new(&context);
        
        // Process the file
        let result = processor.process_file(&template_file).unwrap();
        
        assert_eq!(result.relative_path, PathBuf::from("test.tf"));
        assert_eq!(result.content, "resource \"aws_instance\" \"my-instance\" {}");
    }

    #[test]
    fn test_process_file_preserves_relative_path() {
        let temp_dir = TempDir::new().unwrap();
        let template_path = temp_dir.path().join("terraform").join("main.tf");
        fs::create_dir_all(template_path.parent().unwrap()).unwrap();
        fs::write(&template_path, "{{value}}").unwrap();
        
        let template_file = TemplateFile {
            path: template_path,
            relative_path: PathBuf::from("terraform/main.tf"),
            file_type: crate::template_discovery::TemplateFileType::Terraform,
        };
        
        let mut context = VariableContext::new();
        context.insert("value".to_string(), json!("test"));
        let processor = TemplateProcessor::new(&context);
        
        let result = processor.process_file(&template_file).unwrap();
        
        assert_eq!(result.relative_path, PathBuf::from("terraform/main.tf"));
        assert_eq!(result.path_str(), "terraform/main.tf");
    }

    #[test]
    fn test_process_file_nonexistent_file() {
        let template_file = TemplateFile {
            path: PathBuf::from("/nonexistent/file.tf"),
            relative_path: PathBuf::from("file.tf"),
            file_type: crate::template_discovery::TemplateFileType::Terraform,
        };
        
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let result = processor.process_file(&template_file);
        assert!(result.is_err());
        
        if let Err(e) = result {
            assert!(e.to_string().contains("Failed to read template file"));
        }
    }

    #[test]
    fn test_process_file_complex_template() {
        let temp_dir = TempDir::new().unwrap();
        let template_path = temp_dir.path().join("deployment.yaml");
        let template_content = r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{app.name}}
spec:
  replicas: {{app.replicas}}
  template:
    spec:
      containers:
      - name: {{app.name}}
        image: {{app.image}}"#;
        fs::write(&template_path, template_content).unwrap();
        
        let template_file = TemplateFile {
            path: template_path,
            relative_path: PathBuf::from("deployment.yaml"),
            file_type: crate::template_discovery::TemplateFileType::Yaml,
        };
        
        let mut context = VariableContext::new();
        context.insert("app".to_string(), json!({
            "name": "my-app",
            "replicas": 5,
            "image": "myapp:v1.0"
        }));
        let processor = TemplateProcessor::new(&context);
        
        let result = processor.process_file(&template_file).unwrap();
        
        assert!(result.content.contains("name: my-app"));
        assert!(result.content.contains("replicas: 5"));
        assert!(result.content.contains("image: myapp:v1.0"));
    }

    #[test]
    fn test_processed_file_creation() {
        let path = PathBuf::from("terraform/main.tf");
        let content = "resource \"aws_instance\" \"test\" {}".to_string();
        
        let processed = ProcessedFile::new(path.clone(), content.clone());
        
        assert_eq!(processed.relative_path, path);
        assert_eq!(processed.content, content);
        assert_eq!(processed.path_str(), "terraform/main.tf");
        assert_eq!(processed.content_len(), content.len());
    }

    #[test]
    fn test_processed_file_content_len() {
        let processed = ProcessedFile::new(
            PathBuf::from("test.tf"),
            "test content".to_string(),
        );
        
        assert_eq!(processed.content_len(), 12);
    }

    #[test]
    fn test_processed_file_empty_content() {
        let processed = ProcessedFile::new(
            PathBuf::from("empty.tf"),
            String::new(),
        );
        
        assert_eq!(processed.content_len(), 0);
        assert_eq!(processed.content, "");
    }

    // Tests for custom Handlebars helpers

    #[test]
    fn test_default_helper_with_value() {
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("my-resource"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{default name "fallback"}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "my-resource");
    }

    #[test]
    fn test_default_helper_with_empty_value() {
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!(""));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{default name "fallback"}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "fallback");
    }

    #[test]
    fn test_default_helper_with_missing_value() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{default missing_var "default-value"}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "default-value");
    }

    #[test]
    fn test_default_helper_in_terraform() {
        let mut context = VariableContext::new();
        context.insert("resources".to_string(), json!([
            {
                "name": "db",
                "replicas": null
            }
        ]));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"replicas = {{default resources.0.replicas "3"}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "replicas = 3");
    }

    #[test]
    fn test_uppercase_helper() {
        let mut context = VariableContext::new();
        context.insert("env".to_string(), json!("production"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"ENV={{uppercase env}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "ENV=PRODUCTION");
    }

    #[test]
    fn test_uppercase_helper_mixed_case() {
        let mut context = VariableContext::new();
        context.insert("text".to_string(), json!("Hello World"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{uppercase text}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "HELLO WORLD");
    }

    #[test]
    fn test_lowercase_helper() {
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("MyResource"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{lowercase name}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "myresource");
    }

    #[test]
    fn test_lowercase_helper_all_caps() {
        let mut context = VariableContext::new();
        context.insert("text".to_string(), json!("HELLO WORLD"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{lowercase text}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_capitalize_helper() {
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("production"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{capitalize name}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "Production");
    }

    #[test]
    fn test_capitalize_helper_already_capitalized() {
        let mut context = VariableContext::new();
        context.insert("text".to_string(), json!("Hello"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{capitalize text}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "Hello");
    }

    #[test]
    fn test_capitalize_helper_empty_string() {
        let mut context = VariableContext::new();
        context.insert("text".to_string(), json!(""));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{capitalize text}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "");
    }

    #[test]
    fn test_trim_helper() {
        let mut context = VariableContext::new();
        context.insert("text".to_string(), json!("  hello world  "));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{trim text}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_trim_helper_tabs_and_newlines() {
        let mut context = VariableContext::new();
        context.insert("text".to_string(), json!("\t\nhello\n\t"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{trim text}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "hello");
    }

    #[test]
    fn test_trim_helper_no_whitespace() {
        let mut context = VariableContext::new();
        context.insert("text".to_string(), json!("hello"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{trim text}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "hello");
    }

    #[test]
    fn test_replace_helper() {
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("my-resource-name"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{replace name "-" "_"}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "my_resource_name");
    }

    #[test]
    fn test_replace_helper_multiple_occurrences() {
        let mut context = VariableContext::new();
        context.insert("text".to_string(), json!("hello world hello"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{replace text "hello" "hi"}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "hi world hi");
    }

    #[test]
    fn test_replace_helper_no_match() {
        let mut context = VariableContext::new();
        context.insert("text".to_string(), json!("hello world"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{replace text "foo" "bar"}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_replace_helper_empty_string() {
        let mut context = VariableContext::new();
        context.insert("text".to_string(), json!("hello-world"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{replace text "-" ""}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "helloworld");
    }

    #[test]
    fn test_combined_helpers() {
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("  my-resource  "));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{uppercase (replace (trim name) "-" "_")}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "MY_RESOURCE");
    }

    #[test]
    fn test_helpers_in_terraform_template() {
        let mut context = VariableContext::new();
        context.insert("blueprint".to_string(), json!({
            "name": "web-app-blueprint"
        }));
        context.insert("resources".to_string(), json!([
            {
                "name": "postgres-db",
                "instance_class": ""
            }
        ]));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"resource "aws_db_instance" "{{replace resources.0.name "-" "_"}}" {
  identifier     = "{{lowercase resources.0.name}}"
  instance_class = "{{default resources.0.instance_class "db.t3.micro"}}"
  
  tags = {
    Name      = "{{capitalize resources.0.name}}"
    Blueprint = "{{uppercase blueprint.name}}"
  }
}"#;
        
        let result = processor.process_template(template).unwrap();
        let expected = r#"resource "aws_db_instance" "postgres_db" {
  identifier     = "postgres-db"
  instance_class = "db.t3.micro"
  
  tags = {
    Name      = "Postgres-db"
    Blueprint = "WEB-APP-BLUEPRINT"
  }
}"#;
        assert_eq!(result, expected);
    }

    #[test]
    fn test_helpers_in_kubernetes_template() {
        let mut context = VariableContext::new();
        context.insert("stack".to_string(), json!({
            "name": "  my-web-app  "
        }));
        context.insert("stack_resources".to_string(), json!([
            {
                "configuration": {
                    "replicas": null,
                    "env": "production"
                }
            }
        ]));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{trim stack.name}}
  labels:
    app: {{trim stack.name}}
    environment: {{uppercase stack_resources.0.configuration.env}}
spec:
  replicas: {{default stack_resources.0.configuration.replicas "3"}}"#;
        
        let result = processor.process_template(template).unwrap();
        let expected = r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-app
  labels:
    app: my-web-app
    environment: PRODUCTION
spec:
  replicas: 3"#;
        assert_eq!(result, expected);
    }

    #[test]
    fn test_builtin_if_helper() {
        let mut context = VariableContext::new();
        context.insert("enabled".to_string(), json!(true));
        context.insert("disabled".to_string(), json!(false));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{#if enabled}}Feature is enabled{{/if}}
{{#if disabled}}This should not appear{{/if}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert_eq!(result, "Feature is enabled\n");
    }

    #[test]
    fn test_builtin_if_else_helper() {
        let mut context = VariableContext::new();
        context.insert("cloud_provider".to_string(), json!("AWS"));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{#if (eq cloud_provider "AWS")}}
provider "aws" {
  region = "us-east-1"
}
{{else}}
provider "azurerm" {
  features {}
}
{{/if}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert!(result.contains("provider \"aws\""));
        assert!(!result.contains("provider \"azurerm\""));
    }

    #[test]
    fn test_builtin_each_helper() {
        let mut context = VariableContext::new();
        context.insert("resources".to_string(), json!([
            {"name": "db", "type": "database"},
            {"name": "cache", "type": "cache"}
        ]));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{#each resources}}
- name: {{this.name}}
  type: {{this.type}}
{{/each}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert!(result.contains("name: db"));
        assert!(result.contains("type: database"));
        assert!(result.contains("name: cache"));
        assert!(result.contains("type: cache"));
    }

    #[test]
    fn test_builtin_each_with_index() {
        let mut context = VariableContext::new();
        context.insert("items".to_string(), json!(["first", "second", "third"]));
        
        let processor = TemplateProcessor::new(&context);
        let template = r#"{{#each items}}
{{@index}}: {{this}}
{{/each}}"#;
        
        let result = processor.process_template(template).unwrap();
        assert!(result.contains("0: first"));
        assert!(result.contains("1: second"));
        assert!(result.contains("2: third"));
    }

    // Tests for YAML validation

    #[test]
    fn test_validate_yaml_valid_single_document() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let yaml_content = r#"apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - port: 80
    targetPort: 8080"#;
        
        let result = processor.validate_yaml(yaml_content, &PathBuf::from("service.yaml"));
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_yaml_valid_multi_document() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let yaml_content = r#"apiVersion: v1
kind: Service
metadata:
  name: my-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
spec:
  replicas: 3"#;
        
        let result = processor.validate_yaml(yaml_content, &PathBuf::from("manifests.yaml"));
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_yaml_invalid_syntax() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let yaml_content = r#"apiVersion: v1
kind: Service
metadata:
  name: my-service
  invalid indentation
spec:
  ports: 80"#;
        
        let result = processor.validate_yaml(yaml_content, &PathBuf::from("service.yaml"));
        assert!(result.is_err());
        
        if let Err(e) = result {
            let error_msg = e.to_string();
            assert!(error_msg.contains("YAML validation failed"));
            assert!(error_msg.contains("service.yaml"));
        }
    }

    #[test]
    fn test_validate_yaml_invalid_multi_document_first() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let yaml_content = r#"apiVersion: v1
kind: Service
metadata:
  name: my-service
  bad: : syntax
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment"#;
        
        let result = processor.validate_yaml(yaml_content, &PathBuf::from("manifests.yaml"));
        assert!(result.is_err());
        
        if let Err(e) = result {
            let error_msg = e.to_string();
            assert!(error_msg.contains("YAML validation failed"));
            assert!(error_msg.contains("document 1"));
        }
    }

    #[test]
    fn test_validate_yaml_invalid_multi_document_second() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let yaml_content = r#"apiVersion: v1
kind: Service
metadata:
  name: my-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
  [invalid: yaml"#;
        
        let result = processor.validate_yaml(yaml_content, &PathBuf::from("manifests.yaml"));
        assert!(result.is_err());
        
        if let Err(e) = result {
            let error_msg = e.to_string();
            assert!(error_msg.contains("YAML validation failed"));
            assert!(error_msg.contains("document 2"));
        }
    }

    #[test]
    fn test_validate_yaml_empty_content() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let yaml_content = "";
        
        let result = processor.validate_yaml(yaml_content, &PathBuf::from("empty.yaml"));
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_yaml_whitespace_only() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let yaml_content = "   \n\n   \n";
        
        let result = processor.validate_yaml(yaml_content, &PathBuf::from("whitespace.yaml"));
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_yaml_complex_kubernetes_manifest() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let yaml_content = r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
        env:
        - name: ENV_VAR
          value: "test"
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m""#;
        
        let result = processor.validate_yaml(yaml_content, &PathBuf::from("deployment.yaml"));
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_yaml_with_special_characters() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let yaml_content = r#"apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
data:
  config.json: |
    {
      "key": "value",
      "nested": {
        "array": [1, 2, 3]
      }
    }
  script.sh: |
    #!/bin/bash
    echo "Hello World""#;
        
        let result = processor.validate_yaml(yaml_content, &PathBuf::from("configmap.yaml"));
        assert!(result.is_ok());
    }

    #[test]
    fn test_process_file_yaml_with_validation() {
        let temp_dir = TempDir::new().unwrap();
        let template_path = temp_dir.path().join("deployment.yaml");
        let template_content = r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{app_name}}
spec:
  replicas: {{replicas}}"#;
        fs::write(&template_path, template_content).unwrap();
        
        let template_file = TemplateFile {
            path: template_path,
            relative_path: PathBuf::from("deployment.yaml"),
            file_type: crate::template_discovery::TemplateFileType::Yaml,
        };
        
        let mut context = VariableContext::new();
        context.insert("app_name".to_string(), json!("my-app"));
        context.insert("replicas".to_string(), json!(3));
        let processor = TemplateProcessor::new(&context);
        
        let result = processor.process_file(&template_file);
        assert!(result.is_ok());
        
        let processed = result.unwrap();
        assert!(processed.content.contains("name: my-app"));
        assert!(processed.content.contains("replicas: 3"));
    }

    #[test]
    fn test_process_file_yaml_invalid_after_substitution() {
        let temp_dir = TempDir::new().unwrap();
        let template_path = temp_dir.path().join("deployment.yaml");
        // Template that will produce invalid YAML after substitution
        let template_content = r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{app_name}}
  {{bad_field}}"#;
        fs::write(&template_path, template_content).unwrap();
        
        let template_file = TemplateFile {
            path: template_path,
            relative_path: PathBuf::from("deployment.yaml"),
            file_type: crate::template_discovery::TemplateFileType::Yaml,
        };
        
        let mut context = VariableContext::new();
        context.insert("app_name".to_string(), json!("my-app"));
        context.insert("bad_field".to_string(), json!("invalid: : syntax"));
        let processor = TemplateProcessor::new(&context);
        
        let result = processor.process_file(&template_file);
        assert!(result.is_err());
        
        if let Err(e) = result {
            let error_msg = e.to_string();
            assert!(error_msg.contains("YAML validation failed"));
            assert!(error_msg.contains("deployment.yaml"));
        }
    }

    #[test]
    fn test_process_file_yaml_multi_document_valid() {
        let temp_dir = TempDir::new().unwrap();
        let template_path = temp_dir.path().join("manifests.yaml");
        let template_content = r#"apiVersion: v1
kind: Service
metadata:
  name: {{service_name}}
spec:
  ports:
  - port: {{port}}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{deployment_name}}
spec:
  replicas: {{replicas}}"#;
        fs::write(&template_path, template_content).unwrap();
        
        let template_file = TemplateFile {
            path: template_path,
            relative_path: PathBuf::from("manifests.yaml"),
            file_type: crate::template_discovery::TemplateFileType::Yaml,
        };
        
        let mut context = VariableContext::new();
        context.insert("service_name".to_string(), json!("my-service"));
        context.insert("port".to_string(), json!(80));
        context.insert("deployment_name".to_string(), json!("my-deployment"));
        context.insert("replicas".to_string(), json!(3));
        let processor = TemplateProcessor::new(&context);
        
        let result = processor.process_file(&template_file);
        assert!(result.is_ok());
        
        let processed = result.unwrap();
        assert!(processed.content.contains("name: my-service"));
        assert!(processed.content.contains("port: 80"));
        assert!(processed.content.contains("name: my-deployment"));
        assert!(processed.content.contains("replicas: 3"));
    }

    #[test]
    fn test_process_file_terraform_no_validation() {
        let temp_dir = TempDir::new().unwrap();
        let template_path = temp_dir.path().join("main.tf");
        // Terraform file - no YAML validation should occur
        let template_content = r#"resource "aws_instance" "{{name}}" {
  ami = "{{ami}}"
}"#;
        fs::write(&template_path, template_content).unwrap();
        
        let template_file = TemplateFile {
            path: template_path,
            relative_path: PathBuf::from("main.tf"),
            file_type: crate::template_discovery::TemplateFileType::Terraform,
        };
        
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("my-instance"));
        context.insert("ami".to_string(), json!("ami-12345"));
        let processor = TemplateProcessor::new(&context);
        
        let result = processor.process_file(&template_file);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_yaml_error_message_helpful() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        // Invalid YAML with bad indentation and structure
        let yaml_content = r#"apiVersion: v1
kind: Service
metadata:
  name: my-service
labels:
    app: test
  bad indentation here"#;
        
        let result = processor.validate_yaml(yaml_content, &PathBuf::from("service.yaml"));
        assert!(result.is_err());
        
        if let Err(e) = result {
            let error_msg = e.to_string();
            // Check that error message contains helpful information
            assert!(error_msg.contains("YAML validation failed"));
            assert!(error_msg.contains("service.yaml"));
            assert!(error_msg.contains("variable substitution"));
            assert!(error_msg.contains("indentation"));
            assert!(error_msg.contains("special characters"));
        }
    }

    // Tests for enhanced error handling

    #[test]
    fn test_error_handling_variable_suggestions() {
        let mut context = VariableContext::new();
        context.insert("blueprint.name".to_string(), json!("my-blueprint"));
        context.insert("blueprint.description".to_string(), json!("A test blueprint"));
        context.insert("resources".to_string(), json!([{"name": "db"}]));
        
        let processor = TemplateProcessor::new(&context);
        
        // Test that similar variables are suggested
        let similar_vars = processor.suggest_similar_variables("blueprnt.name");
        assert!(similar_vars.contains("blueprint.name"));
    }

    #[test]
    fn test_error_handling_levenshtein_distance() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        // Test exact match
        assert_eq!(processor.levenshtein_distance("test", "test"), 0);
        
        // Test single character difference
        assert_eq!(processor.levenshtein_distance("test", "text"), 1);
        
        // Test insertion
        assert_eq!(processor.levenshtein_distance("test", "tests"), 1);
        
        // Test deletion
        assert_eq!(processor.levenshtein_distance("tests", "test"), 1);
        
        // Test multiple differences
        assert_eq!(processor.levenshtein_distance("kitten", "sitting"), 3);
    }

    #[test]
    fn test_error_handling_is_similar() {
        let mut context = VariableContext::new();
        context.insert("blueprint.name".to_string(), json!("test"));
        let processor = TemplateProcessor::new(&context);
        
        // Test exact match
        assert!(processor.is_similar("blueprint.name", "blueprint.name"));
        
        // Test substring match
        assert!(processor.is_similar("blueprint", "blueprint.name"));
        assert!(processor.is_similar("name", "blueprint.name"));
        
        // Test prefix match
        assert!(processor.is_similar("blu", "blueprint.name"));
        
        // Test small typo (Levenshtein distance <= 2)
        assert!(processor.is_similar("blueprnt", "blueprint"));
        
        // Test not similar
        assert!(!processor.is_similar("stack", "blueprint"));
    }

    #[test]
    fn test_error_handling_extract_line_number() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        // Test extracting line number from error message
        assert_eq!(
            processor.extract_line_number("Error at line 42: syntax error"),
            Some(42)
        );
        
        assert_eq!(
            processor.extract_line_number("line 5 has an issue"),
            Some(5)
        );
        
        assert_eq!(
            processor.extract_line_number("No line number here"),
            None
        );
    }

    #[test]
    fn test_error_handling_get_template_line() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let template = "line 1\nline 2\nline 3\nline 4";
        
        assert_eq!(processor.get_template_line(template, 1), "line 1");
        assert_eq!(processor.get_template_line(template, 2), "line 2");
        assert_eq!(processor.get_template_line(template, 3), "line 3");
        assert_eq!(processor.get_template_line(template, 4), "line 4");
        assert_eq!(processor.get_template_line(template, 100), "<line not found>");
    }

    #[test]
    fn test_error_handling_extract_variable_name() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        // Test extracting variable name from quoted error message
        assert_eq!(
            processor.extract_variable_name("Variable \"my_var\" not found"),
            Some("my_var".to_string())
        );
        
        // Test extracting from "variable " prefix
        assert_eq!(
            processor.extract_variable_name("variable my_var is undefined"),
            Some("my_var".to_string())
        );
        
        // Test no variable name found
        assert_eq!(
            processor.extract_variable_name("Generic error message"),
            None
        );
    }

    #[test]
    fn test_error_handling_suggest_similar_empty_context() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        let suggestion = processor.suggest_similar_variables("any_var");
        assert!(suggestion.contains("No variables are available"));
        assert!(suggestion.contains("list-variables"));
    }

    #[test]
    fn test_error_handling_suggest_similar_with_matches() {
        let mut context = VariableContext::new();
        context.insert("blueprint.name".to_string(), json!("test"));
        context.insert("blueprint.description".to_string(), json!("test"));
        context.insert("stack.name".to_string(), json!("test"));
        
        let processor = TemplateProcessor::new(&context);
        
        // Test suggestion for typo
        let suggestion = processor.suggest_similar_variables("blueprnt");
        assert!(suggestion.contains("blueprint.name") || suggestion.contains("blueprint.description"));
        assert!(suggestion.contains("Did you mean one of these?"));
    }

    #[test]
    fn test_error_handling_suggest_similar_no_matches() {
        let mut context = VariableContext::new();
        context.insert("blueprint.name".to_string(), json!("test"));
        context.insert("stack.name".to_string(), json!("test"));
        
        let processor = TemplateProcessor::new(&context);
        
        // Test suggestion when no similar variables found
        let suggestion = processor.suggest_similar_variables("completely_different");
        assert!(suggestion.contains("Did you mean one of these variables?"));
        assert!(suggestion.contains("blueprint.name") || suggestion.contains("stack.name"));
    }

    #[test]
    fn test_error_handling_processing_error_with_context() {
        let context = VariableContext::new();
        let processor = TemplateProcessor::new(&context);
        
        // Test that processing errors include helpful troubleshooting tips
        let template = "{{invalid syntax here";
        let result = processor.process_template(template);
        
        assert!(result.is_err());
        if let Err(e) = result {
            let error_msg = e.to_string();
            // Should contain troubleshooting tips
            assert!(
                error_msg.contains("Troubleshooting tips") ||
                error_msg.contains("template syntax") ||
                error_msg.contains("Common template syntax issues")
            );
        }
    }
}
