use crate::models::{Blueprint, Stack};
use serde_json::{json, Value};
use std::collections::HashMap;

/// Builder for creating variable contexts from blueprints and stacks
pub struct VariableContextBuilder;

impl VariableContextBuilder {
    /// Create a new VariableContextBuilder
    pub fn new() -> Self {
        VariableContextBuilder
    }

    /// Create a VariableContext from a Blueprint
    /// 
    /// Extracts blueprint metadata and resources into a flattened variable structure.
    /// Creates both nested JSON structures and flattened dot-notation paths for easy access.
    /// 
    /// # Arguments
    /// * `blueprint` - The blueprint to extract variables from
    /// 
    /// # Returns
    /// A VariableContext containing all blueprint data
    /// 
    /// # Variable Structure
    /// - `blueprint.id` - Blueprint UUID
    /// - `blueprint.name` - Blueprint name
    /// - `blueprint.description` - Blueprint description (if present)
    /// - `resources` - Full array of resources
    /// - `resources[N].id` - Resource UUID at index N
    /// - `resources[N].name` - Resource name at index N
    /// - `resources[N].description` - Resource description at index N
    /// - `resources[N].resource_type.id` - Resource type UUID
    /// - `resources[N].resource_type.name` - Resource type name
    /// - `resources[N].resource_type.category` - Resource type category
    /// - `resources[N].cloud_provider.id` - Cloud provider UUID
    /// - `resources[N].cloud_provider.name` - Cloud provider name
    /// - `resources[N].cloud_provider.display_name` - Cloud provider display name
    /// - `resources[N].configuration` - Resource configuration object
    /// - `resources[N].cloud_specific_properties.{key}` - Cloud-specific property values
    /// 
    /// # Examples
    /// ```
    /// let blueprint = fetch_blueprint_from_api();
    /// let context = VariableContextBuilder::from_blueprint(&blueprint);
    /// 
    /// // Access blueprint metadata
    /// let name = context.get("blueprint.name");
    /// 
    /// // Access resource data
    /// let resource_name = context.get("resources[0].name");
    /// let cloud_provider = context.get("resources[0].cloud_provider.name");
    /// ```
    pub fn from_blueprint(blueprint: &Blueprint) -> VariableContext {
        let mut context = VariableContext::new();

        // Insert blueprint metadata
        context.insert("blueprint.id".to_string(), json!(blueprint.id.to_string()));
        context.insert("blueprint.name".to_string(), json!(blueprint.name));
        
        if let Some(ref description) = blueprint.description {
            context.insert("blueprint.description".to_string(), json!(description));
        }

        // Convert resources to JSON array
        let resources_json: Vec<Value> = blueprint
            .resources
            .iter()
            .map(|resource| {
                let mut resource_obj = serde_json::Map::new();
                
                resource_obj.insert("id".to_string(), json!(resource.id.to_string()));
                resource_obj.insert("name".to_string(), json!(resource.name));
                
                if let Some(ref description) = resource.description {
                    resource_obj.insert("description".to_string(), json!(description));
                }

                // Add resource_type as nested object
                let mut resource_type_obj = serde_json::Map::new();
                resource_type_obj.insert("id".to_string(), json!(resource.resource_type.id.to_string()));
                resource_type_obj.insert("name".to_string(), json!(resource.resource_type.name));
                resource_type_obj.insert("category".to_string(), json!(resource.resource_type.category));
                resource_obj.insert("resource_type".to_string(), Value::Object(resource_type_obj));

                // Add cloud_provider as nested object
                let mut cloud_provider_obj = serde_json::Map::new();
                cloud_provider_obj.insert("id".to_string(), json!(resource.cloud_provider.id.to_string()));
                cloud_provider_obj.insert("name".to_string(), json!(resource.cloud_provider.name));
                cloud_provider_obj.insert("display_name".to_string(), json!(resource.cloud_provider.display_name));
                resource_obj.insert("cloud_provider".to_string(), Value::Object(cloud_provider_obj));

                // Add configuration
                resource_obj.insert("configuration".to_string(), resource.configuration.clone());

                // Add cloud_specific_properties
                let cloud_props: serde_json::Map<String, Value> = resource
                    .cloud_specific_properties
                    .iter()
                    .map(|(k, v)| (k.clone(), v.clone()))
                    .collect();
                resource_obj.insert("cloud_specific_properties".to_string(), Value::Object(cloud_props));

                Value::Object(resource_obj)
            })
            .collect();

        // Insert the full resources array
        context.insert("resources".to_string(), Value::Array(resources_json.clone()));

        // Create flattened accessors for each resource
        for (index, resource) in blueprint.resources.iter().enumerate() {
            let prefix = format!("resources[{}]", index);

            context.insert(format!("{}.id", prefix), json!(resource.id.to_string()));
            context.insert(format!("{}.name", prefix), json!(resource.name));
            
            if let Some(ref description) = resource.description {
                context.insert(format!("{}.description", prefix), json!(description));
            }

            // Flatten resource_type
            context.insert(
                format!("{}.resource_type.id", prefix),
                json!(resource.resource_type.id.to_string()),
            );
            context.insert(
                format!("{}.resource_type.name", prefix),
                json!(resource.resource_type.name),
            );
            context.insert(
                format!("{}.resource_type.category", prefix),
                json!(resource.resource_type.category),
            );

            // Flatten cloud_provider
            context.insert(
                format!("{}.cloud_provider.id", prefix),
                json!(resource.cloud_provider.id.to_string()),
            );
            context.insert(
                format!("{}.cloud_provider.name", prefix),
                json!(resource.cloud_provider.name),
            );
            context.insert(
                format!("{}.cloud_provider.display_name", prefix),
                json!(resource.cloud_provider.display_name),
            );

            // Insert configuration as a whole object
            context.insert(
                format!("{}.configuration", prefix),
                resource.configuration.clone(),
            );

            // Flatten cloud_specific_properties
            for (key, value) in &resource.cloud_specific_properties {
                context.insert(
                    format!("{}.cloud_specific_properties.{}", prefix, key),
                    value.clone(),
                );
            }
        }

        // Add supported_cloud_providers array
        let cloud_providers_json: Vec<Value> = blueprint
            .supported_cloud_providers
            .iter()
            .map(|cp| {
                json!({
                    "id": cp.id.to_string(),
                    "name": cp.name,
                    "display_name": cp.display_name
                })
            })
            .collect();
        context.insert("supported_cloud_providers".to_string(), Value::Array(cloud_providers_json));

        context
    }

    /// Create a VariableContext from a Stack
    /// 
    /// Extracts stack metadata and stack resources into a flattened variable structure.
    /// Creates both nested JSON structures and flattened dot-notation paths for easy access.
    /// 
    /// # Arguments
    /// * `stack` - The stack to extract variables from
    /// 
    /// # Returns
    /// A VariableContext containing all stack data
    /// 
    /// # Variable Structure
    /// - `stack.id` - Stack UUID
    /// - `stack.name` - Stack name
    /// - `stack.description` - Stack description (if present)
    /// - `stack.cloud_name` - Cloud name for the stack
    /// - `stack.stack_type` - Stack type (e.g., INFRASTRUCTURE_ONLY)
    /// - `stack_resources` - Full array of stack resources
    /// - `stack_resources[N].id` - Stack resource UUID at index N
    /// - `stack_resources[N].name` - Stack resource name at index N
    /// - `stack_resources[N].description` - Stack resource description at index N
    /// - `stack_resources[N].resource_type.id` - Resource type UUID
    /// - `stack_resources[N].resource_type.name` - Resource type name
    /// - `stack_resources[N].resource_type.category` - Resource type category
    /// - `stack_resources[N].cloud_provider.id` - Cloud provider UUID
    /// - `stack_resources[N].cloud_provider.name` - Cloud provider name
    /// - `stack_resources[N].cloud_provider.display_name` - Cloud provider display name
    /// - `stack_resources[N].configuration.{key}` - Stack resource configuration values
    /// 
    /// # Examples
    /// ```
    /// let stack = fetch_stack_from_api();
    /// let context = VariableContextBuilder::from_stack(&stack);
    /// 
    /// // Access stack metadata
    /// let name = context.get("stack.name");
    /// let cloud = context.get("stack.cloud_name");
    /// 
    /// // Access stack resource data
    /// let resource_name = context.get("stack_resources[0].name");
    /// let cloud_provider = context.get("stack_resources[0].cloud_provider.name");
    /// ```
    pub fn from_stack(stack: &Stack) -> VariableContext {
        let mut context = VariableContext::new();

        // Insert stack metadata
        context.insert("stack.id".to_string(), json!(stack.id.to_string()));
        context.insert("stack.name".to_string(), json!(stack.name));
        
        if let Some(ref description) = stack.description {
            context.insert("stack.description".to_string(), json!(description));
        }

        context.insert("stack.cloud_name".to_string(), json!(stack.cloud_name));
        context.insert("stack.stack_type".to_string(), json!(stack.stack_type));

        // Convert stack_resources to JSON array
        let stack_resources_json: Vec<Value> = stack
            .stack_resources
            .iter()
            .map(|resource| {
                let mut resource_obj = serde_json::Map::new();
                
                resource_obj.insert("id".to_string(), json!(resource.id.to_string()));
                resource_obj.insert("name".to_string(), json!(resource.name));
                
                if let Some(ref description) = resource.description {
                    resource_obj.insert("description".to_string(), json!(description));
                }

                // Add resource_type as nested object
                let mut resource_type_obj = serde_json::Map::new();
                resource_type_obj.insert("id".to_string(), json!(resource.resource_type.id.to_string()));
                resource_type_obj.insert("name".to_string(), json!(resource.resource_type.name));
                resource_type_obj.insert("category".to_string(), json!(resource.resource_type.category));
                resource_obj.insert("resource_type".to_string(), Value::Object(resource_type_obj));

                // Add cloud_provider as nested object
                let mut cloud_provider_obj = serde_json::Map::new();
                cloud_provider_obj.insert("id".to_string(), json!(resource.cloud_provider.id.to_string()));
                cloud_provider_obj.insert("name".to_string(), json!(resource.cloud_provider.name));
                cloud_provider_obj.insert("display_name".to_string(), json!(resource.cloud_provider.display_name));
                resource_obj.insert("cloud_provider".to_string(), Value::Object(cloud_provider_obj));

                // Add configuration
                let config: serde_json::Map<String, Value> = resource
                    .configuration
                    .iter()
                    .map(|(k, v)| (k.clone(), v.clone()))
                    .collect();
                resource_obj.insert("configuration".to_string(), Value::Object(config));

                Value::Object(resource_obj)
            })
            .collect();

        // Insert the full stack_resources array
        context.insert("stack_resources".to_string(), Value::Array(stack_resources_json.clone()));

        // Create flattened accessors for each stack resource
        for (index, resource) in stack.stack_resources.iter().enumerate() {
            let prefix = format!("stack_resources[{}]", index);

            context.insert(format!("{}.id", prefix), json!(resource.id.to_string()));
            context.insert(format!("{}.name", prefix), json!(resource.name));
            
            if let Some(ref description) = resource.description {
                context.insert(format!("{}.description", prefix), json!(description));
            }

            // Flatten resource_type
            context.insert(
                format!("{}.resource_type.id", prefix),
                json!(resource.resource_type.id.to_string()),
            );
            context.insert(
                format!("{}.resource_type.name", prefix),
                json!(resource.resource_type.name),
            );
            context.insert(
                format!("{}.resource_type.category", prefix),
                json!(resource.resource_type.category),
            );

            // Flatten cloud_provider
            context.insert(
                format!("{}.cloud_provider.id", prefix),
                json!(resource.cloud_provider.id.to_string()),
            );
            context.insert(
                format!("{}.cloud_provider.name", prefix),
                json!(resource.cloud_provider.name),
            );
            context.insert(
                format!("{}.cloud_provider.display_name", prefix),
                json!(resource.cloud_provider.display_name),
            );

            // Flatten configuration properties
            for (key, value) in &resource.configuration {
                context.insert(
                    format!("{}.configuration.{}", prefix, key),
                    value.clone(),
                );
            }
        }

        // If blueprint is present, include it as well
        if let Some(ref blueprint) = stack.blueprint {
            // Add blueprint metadata
            context.insert("blueprint.id".to_string(), json!(blueprint.id.to_string()));
            context.insert("blueprint.name".to_string(), json!(blueprint.name));
            
            if let Some(ref description) = blueprint.description {
                context.insert("blueprint.description".to_string(), json!(description));
            }
        }

        context
    }

    /// Merge custom variables from a file into an existing VariableContext
    /// 
    /// Loads variables from a JSON or YAML file and merges them with the existing context.
    /// Custom variables override blueprint/stack variables when conflicts occur.
    /// Warnings are displayed for any overrides.
    /// 
    /// # Arguments
    /// * `context` - The existing VariableContext to merge into
    /// * `variables_file` - Path to the JSON or YAML file containing custom variables
    /// 
    /// # Returns
    /// * `Ok(())` if variables were successfully loaded and merged
    /// * `Err(CliError)` if the file cannot be read or parsed
    /// 
    /// # File Format
    /// Both JSON and YAML formats are supported. The file should contain a flat or nested
    /// object structure:
    /// 
    /// JSON example:
    /// ```json
    /// {
    ///   "environment": "production",
    ///   "region": "us-east-1",
    ///   "custom": {
    ///     "domain": "example.com"
    ///   }
    /// }
    /// ```
    /// 
    /// YAML example:
    /// ```yaml
    /// environment: production
    /// region: us-east-1
    /// custom:
    ///   domain: example.com
    /// ```
    /// 
    /// # Variable Override Behavior
    /// - Custom variables are merged into the context
    /// - If a custom variable has the same key as an existing variable, the custom value overrides it
    /// - A warning is printed to stderr for each override
    /// - Nested structures are preserved
    /// 
    /// # Examples
    /// ```
    /// let mut context = VariableContextBuilder::from_blueprint(&blueprint);
    /// VariableContextBuilder::merge_custom_variables(&mut context, Path::new("vars.yaml"))?;
    /// ```
    pub fn merge_custom_variables(
        context: &mut VariableContext,
        variables_file: &std::path::Path,
    ) -> Result<(), crate::error::CliError> {
        use crate::error::CliError;
        use std::fs;

        // Read the file contents
        let file_contents = fs::read_to_string(variables_file).map_err(|e| {
            CliError::VariableFileError(format!(
                "Failed to read variables file '{}': {}",
                variables_file.display(),
                e
            ))
        })?;

        // Determine file format by extension
        let extension = variables_file
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("");

        // Parse the file based on extension
        let custom_vars: serde_json::Value = match extension.to_lowercase().as_str() {
            "json" => {
                serde_json::from_str(&file_contents).map_err(|e| {
                    CliError::VariableFileError(format!(
                        "Failed to parse JSON from '{}': {}",
                        variables_file.display(),
                        e
                    ))
                })?
            }
            "yaml" | "yml" => {
                let yaml_value: serde_yaml::Value =
                    serde_yaml::from_str(&file_contents).map_err(|e| {
                        CliError::VariableFileError(format!(
                            "Failed to parse YAML from '{}': {}",
                            variables_file.display(),
                            e
                        ))
                    })?;
                // Convert YAML value to JSON value for consistency
                serde_json::to_value(yaml_value).map_err(|e| {
                    CliError::VariableFileError(format!(
                        "Failed to convert YAML to JSON: {}",
                        e
                    ))
                })?
            }
            _ => {
                return Err(CliError::VariableFileError(format!(
                    "Unsupported file extension '{}'. Use .json, .yaml, or .yml",
                    extension
                )));
            }
        };

        // Ensure we have an object at the root
        let custom_vars_obj = match custom_vars {
            serde_json::Value::Object(obj) => obj,
            _ => {
                return Err(CliError::VariableFileError(
                    "Variables file must contain a JSON/YAML object at the root".to_string(),
                ));
            }
        };

        // Flatten the custom variables and merge them
        Self::flatten_and_merge(context, "", &serde_json::Value::Object(custom_vars_obj));

        Ok(())
    }

    /// Helper function to flatten nested structures and merge into context
    /// 
    /// Recursively flattens nested objects and arrays into dot-notation keys
    /// and merges them into the variable context. Displays warnings for overrides.
    fn flatten_and_merge(context: &mut VariableContext, prefix: &str, value: &serde_json::Value) {
        match value {
            serde_json::Value::Object(obj) => {
                for (key, val) in obj {
                    let new_prefix = if prefix.is_empty() {
                        key.clone()
                    } else {
                        format!("{}.{}", prefix, key)
                    };

                    // Check if this key already exists (for warning)
                    if context.variables.contains_key(&new_prefix) {
                        eprintln!(
                            "Warning: Custom variable '{}' overrides existing value",
                            new_prefix
                        );
                    }

                    // For objects and arrays, both insert the whole structure and flatten
                    match val {
                        serde_json::Value::Object(_) | serde_json::Value::Array(_) => {
                            // Insert the whole structure
                            context.insert(new_prefix.clone(), val.clone());
                            // Also flatten it
                            Self::flatten_and_merge(context, &new_prefix, val);
                        }
                        _ => {
                            // For primitive values, just insert
                            context.insert(new_prefix, val.clone());
                        }
                    }
                }
            }
            serde_json::Value::Array(arr) => {
                // Insert the whole array
                if !prefix.is_empty() {
                    if context.variables.contains_key(prefix) {
                        eprintln!(
                            "Warning: Custom variable '{}' overrides existing value",
                            prefix
                        );
                    }
                    context.insert(prefix.to_string(), value.clone());
                }

                // Also create indexed accessors
                for (index, item) in arr.iter().enumerate() {
                    let indexed_key = format!("{}[{}]", prefix, index);
                    
                    if context.variables.contains_key(&indexed_key) {
                        eprintln!(
                            "Warning: Custom variable '{}' overrides existing value",
                            indexed_key
                        );
                    }

                    match item {
                        serde_json::Value::Object(_) | serde_json::Value::Array(_) => {
                            // Insert the whole structure
                            context.insert(indexed_key.clone(), item.clone());
                            // Also flatten it
                            Self::flatten_and_merge(context, &indexed_key, item);
                        }
                        _ => {
                            // For primitive values, just insert
                            context.insert(indexed_key, item.clone());
                        }
                    }
                }
            }
            _ => {
                // Primitive value at root (shouldn't happen due to earlier check, but handle it)
                if !prefix.is_empty() {
                    if context.variables.contains_key(prefix) {
                        eprintln!(
                            "Warning: Custom variable '{}' overrides existing value",
                            prefix
                        );
                    }
                    context.insert(prefix.to_string(), value.clone());
                }
            }
        }
    }
}

impl Default for VariableContextBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Context containing variables extracted from blueprints or stacks
/// Variables are stored in a flattened HashMap for easy template access
pub struct VariableContext {
    variables: HashMap<String, Value>,
}

impl VariableContext {
    /// Create a new empty VariableContext
    pub fn new() -> Self {
        VariableContext {
            variables: HashMap::new(),
        }
    }

    /// Get a variable value by path using dot notation
    /// 
    /// Supports:
    /// - Simple keys: "name"
    /// - Nested access: "blueprint.name"
    /// - Array indexing: "resources[0].name"
    /// 
    /// # Arguments
    /// * `path` - The variable path to look up
    /// 
    /// # Returns
    /// * `Some(&Value)` if the variable exists
    /// * `None` if the variable is not found
    /// 
    /// # Examples
    /// ```
    /// let context = VariableContext::new();
    /// let value = context.get("blueprint.name");
    /// let array_value = context.get("resources[0].name");
    /// ```
    pub fn get(&self, path: &str) -> Option<&Value> {
        // First try direct lookup (most common case)
        if let Some(value) = self.variables.get(path) {
            return Some(value);
        }

        // Handle nested path with dot notation and array indexing
        let parts: Vec<&str> = path.split('.').collect();
        if parts.len() == 1 {
            // Single part, but might have array indexing
            return self.get_with_array_index(parts[0]);
        }

        // Start with the first part (might have array indexing)
        let mut current = self.get_with_array_index(parts[0])?;

        // Navigate through the remaining path
        for part in &parts[1..] {
            current = self.navigate_part(current, part)?;
        }

        Some(current)
    }

    /// Helper to get a value with array indexing from the root variables
    fn get_with_array_index(&self, part: &str) -> Option<&Value> {
        if let Some(bracket_pos) = part.find('[') {
            let key = &part[..bracket_pos];
            let index_str = &part[bracket_pos + 1..part.len() - 1];
            let index: usize = index_str.parse().ok()?;

            // Get the array from variables
            let array = self.variables.get(key)?;
            
            // Index into the array
            array.get(index)
        } else {
            // Simple key lookup
            self.variables.get(part)
        }
    }

    /// Helper to navigate through a single part of a path
    fn navigate_part<'a>(&self, current: &'a Value, part: &str) -> Option<&'a Value> {
        if let Some(bracket_pos) = part.find('[') {
            let key = &part[..bracket_pos];
            let index_str = &part[bracket_pos + 1..part.len() - 1];
            let index: usize = index_str.parse().ok()?;

            // Navigate to the key first
            let value = current.get(key)?;
            
            // Then index into the array
            value.get(index)
        } else {
            // Simple nested access
            current.get(part)
        }
    }

    /// List all variables in the context
    /// 
    /// Returns a vector of tuples containing (variable_name, value)
    /// Useful for debugging and the list-variables command
    /// 
    /// # Returns
    /// A vector of (String, &Value) tuples representing all variables
    /// 
    /// # Examples
    /// ```
    /// let context = VariableContext::new();
    /// for (name, value) in context.list_all() {
    ///     println!("{}: {:?}", name, value);
    /// }
    /// ```
    pub fn list_all(&self) -> Vec<(String, &Value)> {
        let mut vars: Vec<(String, &Value)> = self
            .variables
            .iter()
            .map(|(k, v)| (k.clone(), v))
            .collect();
        
        // Sort by key for consistent output
        vars.sort_by(|a, b| a.0.cmp(&b.0));
        
        vars
    }

    /// Insert a variable into the context
    /// 
    /// # Arguments
    /// * `key` - The variable name/path
    /// * `value` - The JSON value to store
    pub fn insert(&mut self, key: String, value: Value) {
        self.variables.insert(key, value);
    }

    /// Get the number of variables in the context
    pub fn len(&self) -> usize {
        self.variables.len()
    }

    /// Check if the context is empty
    pub fn is_empty(&self) -> bool {
        self.variables.is_empty()
    }

    /// Get a reference to the underlying variables HashMap
    pub fn variables(&self) -> &HashMap<String, Value> {
        &self.variables
    }

    /// Get a mutable reference to the underlying variables HashMap
    pub fn variables_mut(&mut self) -> &mut HashMap<String, Value> {
        &mut self.variables
    }
}

impl Default for VariableContext {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Blueprint, BlueprintResource, CloudProvider, ResourceType};
    use serde_json::json;
    use std::collections::HashMap;
    use uuid::Uuid;

    #[test]
    fn test_new_context_is_empty() {
        let context = VariableContext::new();
        assert!(context.is_empty());
        assert_eq!(context.len(), 0);
    }

    #[test]
    fn test_insert_and_get_simple_variable() {
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("test-blueprint"));
        
        assert_eq!(context.len(), 1);
        assert_eq!(context.get("name"), Some(&json!("test-blueprint")));
    }

    #[test]
    fn test_get_nonexistent_variable() {
        let context = VariableContext::new();
        assert_eq!(context.get("nonexistent"), None);
    }

    #[test]
    fn test_get_with_dot_notation() {
        let mut context = VariableContext::new();
        
        // Insert nested structure
        let blueprint = json!({
            "name": "web-app-blueprint",
            "description": "A web application blueprint"
        });
        context.insert("blueprint".to_string(), blueprint);
        
        // Test nested access
        assert_eq!(
            context.get("blueprint.name"),
            Some(&json!("web-app-blueprint"))
        );
        assert_eq!(
            context.get("blueprint.description"),
            Some(&json!("A web application blueprint"))
        );
    }

    #[test]
    fn test_get_with_array_indexing() {
        let mut context = VariableContext::new();
        
        // Insert array structure
        let resources = json!([
            {
                "name": "postgres-db",
                "type": "database"
            },
            {
                "name": "redis-cache",
                "type": "cache"
            }
        ]);
        context.insert("resources".to_string(), resources);
        
        // Test array indexing
        assert_eq!(
            context.get("resources[0].name"),
            Some(&json!("postgres-db"))
        );
        assert_eq!(
            context.get("resources[1].name"),
            Some(&json!("redis-cache"))
        );
        assert_eq!(
            context.get("resources[0].type"),
            Some(&json!("database"))
        );
    }

    #[test]
    fn test_get_with_nested_array_access() {
        let mut context = VariableContext::new();
        
        // Insert complex nested structure
        let data = json!({
            "resources": [
                {
                    "name": "db",
                    "cloud_provider": {
                        "name": "AWS",
                        "display_name": "Amazon Web Services"
                    }
                }
            ]
        });
        context.insert("data".to_string(), data);
        
        // Test nested array access with dot notation
        assert_eq!(
            context.get("data.resources[0].name"),
            Some(&json!("db"))
        );
        assert_eq!(
            context.get("data.resources[0].cloud_provider.name"),
            Some(&json!("AWS"))
        );
    }

    #[test]
    fn test_list_all_variables() {
        let mut context = VariableContext::new();
        context.insert("name".to_string(), json!("test"));
        context.insert("id".to_string(), json!("123"));
        context.insert("active".to_string(), json!(true));
        
        let all_vars = context.list_all();
        assert_eq!(all_vars.len(), 3);
        
        // Check that variables are sorted
        assert_eq!(all_vars[0].0, "active");
        assert_eq!(all_vars[1].0, "id");
        assert_eq!(all_vars[2].0, "name");
    }

    #[test]
    fn test_list_all_empty_context() {
        let context = VariableContext::new();
        let all_vars = context.list_all();
        assert_eq!(all_vars.len(), 0);
    }

    #[test]
    fn test_variables_accessor() {
        let mut context = VariableContext::new();
        context.insert("key1".to_string(), json!("value1"));
        context.insert("key2".to_string(), json!("value2"));
        
        let vars = context.variables();
        assert_eq!(vars.len(), 2);
        assert!(vars.contains_key("key1"));
        assert!(vars.contains_key("key2"));
    }

    #[test]
    fn test_variables_mut_accessor() {
        let mut context = VariableContext::new();
        context.insert("key1".to_string(), json!("value1"));
        
        // Modify through mutable accessor
        let vars_mut = context.variables_mut();
        vars_mut.insert("key2".to_string(), json!("value2"));
        
        assert_eq!(context.len(), 2);
        assert_eq!(context.get("key2"), Some(&json!("value2")));
    }

    #[test]
    fn test_default_trait() {
        let context = VariableContext::default();
        assert!(context.is_empty());
    }

    #[test]
    fn test_builder_default_trait() {
        let _builder = VariableContextBuilder::default();
        // Just verify it compiles and constructs
    }

    // Tests for from_blueprint()

    fn create_test_blueprint() -> Blueprint {
        let cloud_provider = CloudProvider {
            id: Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            name: "AWS".to_string(),
            display_name: "Amazon Web Services".to_string(),
        };

        let resource_type = ResourceType {
            id: Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap(),
            name: "RelationalDatabaseServer".to_string(),
            category: "Database".to_string(),
        };

        let mut cloud_specific_properties = HashMap::new();
        cloud_specific_properties.insert("engine".to_string(), json!("postgres"));
        cloud_specific_properties.insert("engine_version".to_string(), json!("14.7"));
        cloud_specific_properties.insert("instance_class".to_string(), json!("db.t3.micro"));

        let resource = BlueprintResource {
            id: Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap(),
            name: "postgres-db".to_string(),
            description: Some("PostgreSQL database".to_string()),
            resource_type,
            cloud_provider: cloud_provider.clone(),
            configuration: json!({
                "allocated_storage": 20,
                "backup_retention_days": 7
            }),
            cloud_specific_properties,
        };

        Blueprint {
            id: Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap(),
            name: "web-app-blueprint".to_string(),
            description: Some("Web application infrastructure".to_string()),
            resources: vec![resource],
            supported_cloud_providers: vec![cloud_provider],
        }
    }

    #[test]
    fn test_from_blueprint_extracts_metadata() {
        let blueprint = create_test_blueprint();
        let context = VariableContextBuilder::from_blueprint(&blueprint);

        // Check blueprint metadata
        assert_eq!(
            context.get("blueprint.id"),
            Some(&json!("44444444-4444-4444-4444-444444444444"))
        );
        assert_eq!(
            context.get("blueprint.name"),
            Some(&json!("web-app-blueprint"))
        );
        assert_eq!(
            context.get("blueprint.description"),
            Some(&json!("Web application infrastructure"))
        );
    }

    #[test]
    fn test_from_blueprint_extracts_resources_array() {
        let blueprint = create_test_blueprint();
        let context = VariableContextBuilder::from_blueprint(&blueprint);

        // Check that resources array exists
        let resources = context.get("resources");
        assert!(resources.is_some());
        
        // Verify it's an array with one element
        if let Some(Value::Array(arr)) = resources {
            assert_eq!(arr.len(), 1);
        } else {
            panic!("resources should be an array");
        }
    }

    #[test]
    fn test_from_blueprint_flattens_resource_properties() {
        let blueprint = create_test_blueprint();
        let context = VariableContextBuilder::from_blueprint(&blueprint);

        // Check flattened resource properties
        assert_eq!(
            context.get("resources[0].id"),
            Some(&json!("33333333-3333-3333-3333-333333333333"))
        );
        assert_eq!(
            context.get("resources[0].name"),
            Some(&json!("postgres-db"))
        );
        assert_eq!(
            context.get("resources[0].description"),
            Some(&json!("PostgreSQL database"))
        );
    }

    #[test]
    fn test_from_blueprint_flattens_resource_type() {
        let blueprint = create_test_blueprint();
        let context = VariableContextBuilder::from_blueprint(&blueprint);

        // Check flattened resource_type
        assert_eq!(
            context.get("resources[0].resource_type.id"),
            Some(&json!("22222222-2222-2222-2222-222222222222"))
        );
        assert_eq!(
            context.get("resources[0].resource_type.name"),
            Some(&json!("RelationalDatabaseServer"))
        );
        assert_eq!(
            context.get("resources[0].resource_type.category"),
            Some(&json!("Database"))
        );
    }

    #[test]
    fn test_from_blueprint_flattens_cloud_provider() {
        let blueprint = create_test_blueprint();
        let context = VariableContextBuilder::from_blueprint(&blueprint);

        // Check flattened cloud_provider
        assert_eq!(
            context.get("resources[0].cloud_provider.id"),
            Some(&json!("11111111-1111-1111-1111-111111111111"))
        );
        assert_eq!(
            context.get("resources[0].cloud_provider.name"),
            Some(&json!("AWS"))
        );
        assert_eq!(
            context.get("resources[0].cloud_provider.display_name"),
            Some(&json!("Amazon Web Services"))
        );
    }

    #[test]
    fn test_from_blueprint_includes_configuration() {
        let blueprint = create_test_blueprint();
        let context = VariableContextBuilder::from_blueprint(&blueprint);

        // Check configuration object
        let config = context.get("resources[0].configuration");
        assert!(config.is_some());
        
        // Verify configuration content through nested access
        assert_eq!(
            context.get("resources[0].configuration.allocated_storage"),
            Some(&json!(20))
        );
        assert_eq!(
            context.get("resources[0].configuration.backup_retention_days"),
            Some(&json!(7))
        );
    }

    #[test]
    fn test_from_blueprint_flattens_cloud_specific_properties() {
        let blueprint = create_test_blueprint();
        let context = VariableContextBuilder::from_blueprint(&blueprint);

        // Check flattened cloud_specific_properties
        assert_eq!(
            context.get("resources[0].cloud_specific_properties.engine"),
            Some(&json!("postgres"))
        );
        assert_eq!(
            context.get("resources[0].cloud_specific_properties.engine_version"),
            Some(&json!("14.7"))
        );
        assert_eq!(
            context.get("resources[0].cloud_specific_properties.instance_class"),
            Some(&json!("db.t3.micro"))
        );
    }

    #[test]
    fn test_from_blueprint_includes_supported_cloud_providers() {
        let blueprint = create_test_blueprint();
        let context = VariableContextBuilder::from_blueprint(&blueprint);

        // Check supported_cloud_providers array
        let providers = context.get("supported_cloud_providers");
        assert!(providers.is_some());
        
        if let Some(Value::Array(arr)) = providers {
            assert_eq!(arr.len(), 1);
        } else {
            panic!("supported_cloud_providers should be an array");
        }
    }

    #[test]
    fn test_from_blueprint_with_multiple_resources() {
        let cloud_provider = CloudProvider {
            id: Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            name: "AWS".to_string(),
            display_name: "Amazon Web Services".to_string(),
        };

        let db_resource_type = ResourceType {
            id: Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap(),
            name: "RelationalDatabaseServer".to_string(),
            category: "Database".to_string(),
        };

        let cache_resource_type = ResourceType {
            id: Uuid::parse_str("55555555-5555-5555-5555-555555555555").unwrap(),
            name: "Cache".to_string(),
            category: "Cache".to_string(),
        };

        let db_resource = BlueprintResource {
            id: Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap(),
            name: "postgres-db".to_string(),
            description: Some("PostgreSQL database".to_string()),
            resource_type: db_resource_type,
            cloud_provider: cloud_provider.clone(),
            configuration: json!({}),
            cloud_specific_properties: HashMap::new(),
        };

        let cache_resource = BlueprintResource {
            id: Uuid::parse_str("66666666-6666-6666-6666-666666666666").unwrap(),
            name: "redis-cache".to_string(),
            description: Some("Redis cache".to_string()),
            resource_type: cache_resource_type,
            cloud_provider: cloud_provider.clone(),
            configuration: json!({}),
            cloud_specific_properties: HashMap::new(),
        };

        let blueprint = Blueprint {
            id: Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap(),
            name: "multi-resource-blueprint".to_string(),
            description: None,
            resources: vec![db_resource, cache_resource],
            supported_cloud_providers: vec![cloud_provider],
        };

        let context = VariableContextBuilder::from_blueprint(&blueprint);

        // Check both resources are accessible
        assert_eq!(
            context.get("resources[0].name"),
            Some(&json!("postgres-db"))
        );
        assert_eq!(
            context.get("resources[1].name"),
            Some(&json!("redis-cache"))
        );
        assert_eq!(
            context.get("resources[0].resource_type.name"),
            Some(&json!("RelationalDatabaseServer"))
        );
        assert_eq!(
            context.get("resources[1].resource_type.name"),
            Some(&json!("Cache"))
        );
    }

    #[test]
    fn test_from_blueprint_with_no_description() {
        let cloud_provider = CloudProvider {
            id: Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            name: "AWS".to_string(),
            display_name: "Amazon Web Services".to_string(),
        };

        let resource_type = ResourceType {
            id: Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap(),
            name: "Storage".to_string(),
            category: "Storage".to_string(),
        };

        let resource = BlueprintResource {
            id: Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap(),
            name: "s3-bucket".to_string(),
            description: None,
            resource_type,
            cloud_provider: cloud_provider.clone(),
            configuration: json!({}),
            cloud_specific_properties: HashMap::new(),
        };

        let blueprint = Blueprint {
            id: Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap(),
            name: "minimal-blueprint".to_string(),
            description: None,
            resources: vec![resource],
            supported_cloud_providers: vec![cloud_provider],
        };

        let context = VariableContextBuilder::from_blueprint(&blueprint);

        // Blueprint description should not exist
        assert_eq!(context.get("blueprint.description"), None);
        
        // Resource description should not exist
        assert_eq!(context.get("resources[0].description"), None);
        
        // But other fields should exist
        assert_eq!(
            context.get("blueprint.name"),
            Some(&json!("minimal-blueprint"))
        );
        assert_eq!(
            context.get("resources[0].name"),
            Some(&json!("s3-bucket"))
        );
    }

    #[test]
    fn test_from_blueprint_with_empty_resources() {
        let cloud_provider = CloudProvider {
            id: Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            name: "AWS".to_string(),
            display_name: "Amazon Web Services".to_string(),
        };

        let blueprint = Blueprint {
            id: Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap(),
            name: "empty-blueprint".to_string(),
            description: Some("Blueprint with no resources".to_string()),
            resources: vec![],
            supported_cloud_providers: vec![cloud_provider],
        };

        let context = VariableContextBuilder::from_blueprint(&blueprint);

        // Blueprint metadata should exist
        assert_eq!(
            context.get("blueprint.name"),
            Some(&json!("empty-blueprint"))
        );

        // Resources array should exist but be empty
        if let Some(Value::Array(arr)) = context.get("resources") {
            assert_eq!(arr.len(), 0);
        } else {
            panic!("resources should be an array");
        }

        // No resource accessors should exist
        assert_eq!(context.get("resources[0].name"), None);
    }

    // Tests for from_stack()

    fn create_test_stack() -> crate::models::Stack {
        let cloud_provider = CloudProvider {
            id: Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            name: "AWS".to_string(),
            display_name: "Amazon Web Services".to_string(),
        };

        let resource_type = ResourceType {
            id: Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap(),
            name: "RelationalDatabaseServer".to_string(),
            category: "Database".to_string(),
        };

        let mut configuration = HashMap::new();
        configuration.insert("allocated_storage".to_string(), json!(20));
        configuration.insert("backup_retention_days".to_string(), json!(7));
        configuration.insert("engine".to_string(), json!("postgres"));

        let stack_resource = crate::models::StackResource {
            id: Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap(),
            name: "prod-postgres-db".to_string(),
            description: Some("Production PostgreSQL database".to_string()),
            resource_type,
            cloud_provider,
            configuration,
        };

        crate::models::Stack {
            id: Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap(),
            name: "production-stack".to_string(),
            description: Some("Production environment stack".to_string()),
            cloud_name: "aws-us-east-1".to_string(),
            stack_type: "INFRASTRUCTURE_ONLY".to_string(),
            stack_resources: vec![stack_resource],
            blueprint: None,
        }
    }

    #[test]
    fn test_from_stack_extracts_metadata() {
        let stack = create_test_stack();
        let context = VariableContextBuilder::from_stack(&stack);

        // Check stack metadata
        assert_eq!(
            context.get("stack.id"),
            Some(&json!("44444444-4444-4444-4444-444444444444"))
        );
        assert_eq!(
            context.get("stack.name"),
            Some(&json!("production-stack"))
        );
        assert_eq!(
            context.get("stack.description"),
            Some(&json!("Production environment stack"))
        );
        assert_eq!(
            context.get("stack.cloud_name"),
            Some(&json!("aws-us-east-1"))
        );
        assert_eq!(
            context.get("stack.stack_type"),
            Some(&json!("INFRASTRUCTURE_ONLY"))
        );
    }

    #[test]
    fn test_from_stack_extracts_stack_resources_array() {
        let stack = create_test_stack();
        let context = VariableContextBuilder::from_stack(&stack);

        // Check that stack_resources array exists
        let resources = context.get("stack_resources");
        assert!(resources.is_some());
        
        // Verify it's an array with one element
        if let Some(Value::Array(arr)) = resources {
            assert_eq!(arr.len(), 1);
        } else {
            panic!("stack_resources should be an array");
        }
    }

    #[test]
    fn test_from_stack_flattens_stack_resource_properties() {
        let stack = create_test_stack();
        let context = VariableContextBuilder::from_stack(&stack);

        // Check flattened stack resource properties
        assert_eq!(
            context.get("stack_resources[0].id"),
            Some(&json!("33333333-3333-3333-3333-333333333333"))
        );
        assert_eq!(
            context.get("stack_resources[0].name"),
            Some(&json!("prod-postgres-db"))
        );
        assert_eq!(
            context.get("stack_resources[0].description"),
            Some(&json!("Production PostgreSQL database"))
        );
    }

    #[test]
    fn test_from_stack_flattens_resource_type() {
        let stack = create_test_stack();
        let context = VariableContextBuilder::from_stack(&stack);

        // Check flattened resource_type
        assert_eq!(
            context.get("stack_resources[0].resource_type.id"),
            Some(&json!("22222222-2222-2222-2222-222222222222"))
        );
        assert_eq!(
            context.get("stack_resources[0].resource_type.name"),
            Some(&json!("RelationalDatabaseServer"))
        );
        assert_eq!(
            context.get("stack_resources[0].resource_type.category"),
            Some(&json!("Database"))
        );
    }

    #[test]
    fn test_from_stack_flattens_cloud_provider() {
        let stack = create_test_stack();
        let context = VariableContextBuilder::from_stack(&stack);

        // Check flattened cloud_provider
        assert_eq!(
            context.get("stack_resources[0].cloud_provider.id"),
            Some(&json!("11111111-1111-1111-1111-111111111111"))
        );
        assert_eq!(
            context.get("stack_resources[0].cloud_provider.name"),
            Some(&json!("AWS"))
        );
        assert_eq!(
            context.get("stack_resources[0].cloud_provider.display_name"),
            Some(&json!("Amazon Web Services"))
        );
    }

    #[test]
    fn test_from_stack_flattens_configuration() {
        let stack = create_test_stack();
        let context = VariableContextBuilder::from_stack(&stack);

        // Check flattened configuration properties
        assert_eq!(
            context.get("stack_resources[0].configuration.allocated_storage"),
            Some(&json!(20))
        );
        assert_eq!(
            context.get("stack_resources[0].configuration.backup_retention_days"),
            Some(&json!(7))
        );
        assert_eq!(
            context.get("stack_resources[0].configuration.engine"),
            Some(&json!("postgres"))
        );
    }

    #[test]
    fn test_from_stack_with_multiple_stack_resources() {
        let cloud_provider = CloudProvider {
            id: Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            name: "AWS".to_string(),
            display_name: "Amazon Web Services".to_string(),
        };

        let db_resource_type = ResourceType {
            id: Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap(),
            name: "RelationalDatabaseServer".to_string(),
            category: "Database".to_string(),
        };

        let cache_resource_type = ResourceType {
            id: Uuid::parse_str("55555555-5555-5555-5555-555555555555").unwrap(),
            name: "Cache".to_string(),
            category: "Cache".to_string(),
        };

        let db_resource = crate::models::StackResource {
            id: Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap(),
            name: "prod-postgres-db".to_string(),
            description: Some("PostgreSQL database".to_string()),
            resource_type: db_resource_type,
            cloud_provider: cloud_provider.clone(),
            configuration: HashMap::new(),
        };

        let cache_resource = crate::models::StackResource {
            id: Uuid::parse_str("66666666-6666-6666-6666-666666666666").unwrap(),
            name: "prod-redis-cache".to_string(),
            description: Some("Redis cache".to_string()),
            resource_type: cache_resource_type,
            cloud_provider: cloud_provider.clone(),
            configuration: HashMap::new(),
        };

        let stack = crate::models::Stack {
            id: Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap(),
            name: "multi-resource-stack".to_string(),
            description: None,
            cloud_name: "aws-us-east-1".to_string(),
            stack_type: "INFRASTRUCTURE_ONLY".to_string(),
            stack_resources: vec![db_resource, cache_resource],
            blueprint: None,
        };

        let context = VariableContextBuilder::from_stack(&stack);

        // Check both stack resources are accessible
        assert_eq!(
            context.get("stack_resources[0].name"),
            Some(&json!("prod-postgres-db"))
        );
        assert_eq!(
            context.get("stack_resources[1].name"),
            Some(&json!("prod-redis-cache"))
        );
        assert_eq!(
            context.get("stack_resources[0].resource_type.name"),
            Some(&json!("RelationalDatabaseServer"))
        );
        assert_eq!(
            context.get("stack_resources[1].resource_type.name"),
            Some(&json!("Cache"))
        );
    }

    #[test]
    fn test_from_stack_with_no_description() {
        let cloud_provider = CloudProvider {
            id: Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            name: "AWS".to_string(),
            display_name: "Amazon Web Services".to_string(),
        };

        let resource_type = ResourceType {
            id: Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap(),
            name: "Storage".to_string(),
            category: "Storage".to_string(),
        };

        let stack_resource = crate::models::StackResource {
            id: Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap(),
            name: "s3-bucket".to_string(),
            description: None,
            resource_type,
            cloud_provider,
            configuration: HashMap::new(),
        };

        let stack = crate::models::Stack {
            id: Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap(),
            name: "minimal-stack".to_string(),
            description: None,
            cloud_name: "aws-us-west-2".to_string(),
            stack_type: "INFRASTRUCTURE_ONLY".to_string(),
            stack_resources: vec![stack_resource],
            blueprint: None,
        };

        let context = VariableContextBuilder::from_stack(&stack);

        // Stack description should not exist
        assert_eq!(context.get("stack.description"), None);
        
        // Stack resource description should not exist
        assert_eq!(context.get("stack_resources[0].description"), None);
        
        // But other fields should exist
        assert_eq!(
            context.get("stack.name"),
            Some(&json!("minimal-stack"))
        );
        assert_eq!(
            context.get("stack_resources[0].name"),
            Some(&json!("s3-bucket"))
        );
    }

    #[test]
    fn test_from_stack_with_empty_stack_resources() {
        let stack = crate::models::Stack {
            id: Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap(),
            name: "empty-stack".to_string(),
            description: Some("Stack with no resources".to_string()),
            cloud_name: "aws-us-east-1".to_string(),
            stack_type: "INFRASTRUCTURE_ONLY".to_string(),
            stack_resources: vec![],
            blueprint: None,
        };

        let context = VariableContextBuilder::from_stack(&stack);

        // Stack metadata should exist
        assert_eq!(
            context.get("stack.name"),
            Some(&json!("empty-stack"))
        );

        // Stack resources array should exist but be empty
        if let Some(Value::Array(arr)) = context.get("stack_resources") {
            assert_eq!(arr.len(), 0);
        } else {
            panic!("stack_resources should be an array");
        }

        // No stack resource accessors should exist
        assert_eq!(context.get("stack_resources[0].name"), None);
    }

    #[test]
    fn test_from_stack_with_blueprint() {
        let cloud_provider = CloudProvider {
            id: Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            name: "AWS".to_string(),
            display_name: "Amazon Web Services".to_string(),
        };

        let resource_type = ResourceType {
            id: Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap(),
            name: "RelationalDatabaseServer".to_string(),
            category: "Database".to_string(),
        };

        let stack_resource = crate::models::StackResource {
            id: Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap(),
            name: "prod-db".to_string(),
            description: None,
            resource_type: resource_type.clone(),
            cloud_provider: cloud_provider.clone(),
            configuration: HashMap::new(),
        };

        let blueprint_resource = BlueprintResource {
            id: Uuid::parse_str("77777777-7777-7777-7777-777777777777").unwrap(),
            name: "blueprint-db".to_string(),
            description: None,
            resource_type,
            cloud_provider: cloud_provider.clone(),
            configuration: json!({}),
            cloud_specific_properties: HashMap::new(),
        };

        let blueprint = Blueprint {
            id: Uuid::parse_str("88888888-8888-8888-8888-888888888888").unwrap(),
            name: "web-app-blueprint".to_string(),
            description: Some("Web application blueprint".to_string()),
            resources: vec![blueprint_resource],
            supported_cloud_providers: vec![cloud_provider],
        };

        let stack = crate::models::Stack {
            id: Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap(),
            name: "production-stack".to_string(),
            description: Some("Production stack".to_string()),
            cloud_name: "aws-us-east-1".to_string(),
            stack_type: "INFRASTRUCTURE_ONLY".to_string(),
            stack_resources: vec![stack_resource],
            blueprint: Some(blueprint),
        };

        let context = VariableContextBuilder::from_stack(&stack);

        // Stack metadata should exist
        assert_eq!(
            context.get("stack.name"),
            Some(&json!("production-stack"))
        );

        // Blueprint metadata should exist
        assert_eq!(
            context.get("blueprint.id"),
            Some(&json!("88888888-8888-8888-8888-888888888888"))
        );
        assert_eq!(
            context.get("blueprint.name"),
            Some(&json!("web-app-blueprint"))
        );
        assert_eq!(
            context.get("blueprint.description"),
            Some(&json!("Web application blueprint"))
        );
    }

    #[test]
    fn test_from_stack_configuration_nested_access() {
        let cloud_provider = CloudProvider {
            id: Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            name: "AWS".to_string(),
            display_name: "Amazon Web Services".to_string(),
        };

        let resource_type = ResourceType {
            id: Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap(),
            name: "ContainerOrchestrator".to_string(),
            category: "Compute".to_string(),
        };

        let mut configuration = HashMap::new();
        configuration.insert("image".to_string(), json!("nginx:latest"));
        configuration.insert("port".to_string(), json!(80));
        configuration.insert("replicas".to_string(), json!(3));

        let stack_resource = crate::models::StackResource {
            id: Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap(),
            name: "web-app".to_string(),
            description: Some("Web application container".to_string()),
            resource_type,
            cloud_provider,
            configuration,
        };

        let stack = crate::models::Stack {
            id: Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap(),
            name: "app-stack".to_string(),
            description: None,
            cloud_name: "aws-us-east-1".to_string(),
            stack_type: "WEB_APPLICATION".to_string(),
            stack_resources: vec![stack_resource],
            blueprint: None,
        };

        let context = VariableContextBuilder::from_stack(&stack);

        // Test nested access to configuration through the array
        assert_eq!(
            context.get("stack_resources[0].configuration.image"),
            Some(&json!("nginx:latest"))
        );
        assert_eq!(
            context.get("stack_resources[0].configuration.port"),
            Some(&json!(80))
        );
        assert_eq!(
            context.get("stack_resources[0].configuration.replicas"),
            Some(&json!(3))
        );
    }

    // Tests for merge_custom_variables()

    #[test]
    fn test_merge_custom_variables_from_json() {
        use tempfile::NamedTempFile;

        // Create a temporary JSON file
        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("json");
        let json_content = r#"{
            "environment": "production",
            "region": "us-east-1",
            "custom_value": 42
        }"#;
        std::fs::write(&temp_path, json_content).unwrap();

        // Create a context with some existing variables
        let mut context = VariableContext::new();
        context.insert("blueprint.name".to_string(), json!("test-blueprint"));

        // Merge custom variables
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        assert!(result.is_ok());

        // Verify custom variables were added
        assert_eq!(context.get("environment"), Some(&json!("production")));
        assert_eq!(context.get("region"), Some(&json!("us-east-1")));
        assert_eq!(context.get("custom_value"), Some(&json!(42)));

        // Verify existing variables are still present
        assert_eq!(context.get("blueprint.name"), Some(&json!("test-blueprint")));

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }

    #[test]
    fn test_merge_custom_variables_from_yaml() {
        use std::io::Write;
        use tempfile::NamedTempFile;

        // Create a temporary YAML file
        let mut temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("yaml");
        let yaml_content = r#"
environment: staging
region: eu-west-1
replicas: 5
"#;
        std::fs::write(&temp_path, yaml_content).unwrap();

        // Create a context
        let mut context = VariableContext::new();
        context.insert("stack.name".to_string(), json!("test-stack"));

        // Merge custom variables
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        assert!(result.is_ok());

        // Verify custom variables were added
        assert_eq!(context.get("environment"), Some(&json!("staging")));
        assert_eq!(context.get("region"), Some(&json!("eu-west-1")));
        assert_eq!(context.get("replicas"), Some(&json!(5)));

        // Verify existing variables are still present
        assert_eq!(context.get("stack.name"), Some(&json!("test-stack")));

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }

    #[test]
    fn test_merge_custom_variables_with_nested_structure() {
        use tempfile::NamedTempFile;

        // Create a temporary JSON file with nested structure
        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("json");
        let json_content = r#"{
            "database": {
                "host": "db.example.com",
                "port": 5432,
                "credentials": {
                    "username": "admin",
                    "password": "secret"
                }
            }
        }"#;
        std::fs::write(&temp_path, json_content).unwrap();

        // Create a context
        let mut context = VariableContext::new();

        // Merge custom variables
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        assert!(result.is_ok());

        // Verify nested access works
        assert_eq!(context.get("database.host"), Some(&json!("db.example.com")));
        assert_eq!(context.get("database.port"), Some(&json!(5432)));
        assert_eq!(context.get("database.credentials.username"), Some(&json!("admin")));
        assert_eq!(context.get("database.credentials.password"), Some(&json!("secret")));

        // Verify the whole structure is also accessible
        let database = context.get("database");
        assert!(database.is_some());
        assert!(database.unwrap().is_object());

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }

    #[test]
    fn test_merge_custom_variables_with_arrays() {
        use tempfile::NamedTempFile;

        // Create a temporary JSON file with arrays
        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("json");
        let json_content = r#"{
            "servers": [
                {"name": "web-1", "ip": "10.0.1.1"},
                {"name": "web-2", "ip": "10.0.1.2"}
            ],
            "ports": [80, 443, 8080]
        }"#;
        std::fs::write(&temp_path, json_content).unwrap();

        // Create a context
        let mut context = VariableContext::new();

        // Merge custom variables
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        assert!(result.is_ok());

        // Verify array access works
        assert_eq!(context.get("servers[0].name"), Some(&json!("web-1")));
        assert_eq!(context.get("servers[0].ip"), Some(&json!("10.0.1.1")));
        assert_eq!(context.get("servers[1].name"), Some(&json!("web-2")));
        assert_eq!(context.get("servers[1].ip"), Some(&json!("10.0.1.2")));
        assert_eq!(context.get("ports[0]"), Some(&json!(80)));
        assert_eq!(context.get("ports[1]"), Some(&json!(443)));
        assert_eq!(context.get("ports[2]"), Some(&json!(8080)));

        // Verify the whole arrays are also accessible
        let servers = context.get("servers");
        assert!(servers.is_some());
        assert!(servers.unwrap().is_array());

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }

    #[test]
    fn test_merge_custom_variables_overrides_existing() {
        use tempfile::NamedTempFile;

        // Create a temporary JSON file
        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("json");
        let json_content = r#"{
            "blueprint.name": "custom-blueprint",
            "environment": "production"
        }"#;
        std::fs::write(&temp_path, json_content).unwrap();

        // Create a context with existing variables
        let mut context = VariableContext::new();
        context.insert("blueprint.name".to_string(), json!("original-blueprint"));
        context.insert("stack.name".to_string(), json!("test-stack"));

        // Merge custom variables (should override blueprint.name)
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        assert!(result.is_ok());

        // Verify override occurred
        assert_eq!(context.get("blueprint.name"), Some(&json!("custom-blueprint")));
        
        // Verify new variable was added
        assert_eq!(context.get("environment"), Some(&json!("production")));
        
        // Verify non-overridden variable is still present
        assert_eq!(context.get("stack.name"), Some(&json!("test-stack")));

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }

    #[test]
    fn test_merge_custom_variables_invalid_file() {
        use std::path::Path;

        let mut context = VariableContext::new();
        
        // Try to merge from non-existent file
        let result = VariableContextBuilder::merge_custom_variables(
            &mut context,
            Path::new("/nonexistent/file.json"),
        );
        
        assert!(result.is_err());
        if let Err(e) = result {
            assert!(e.to_string().contains("Failed to read variables file"));
        }
    }

    #[test]
    fn test_merge_custom_variables_invalid_json() {
        use tempfile::NamedTempFile;

        // Create a temporary file with invalid JSON
        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("json");
        let invalid_json = r#"{ invalid json content }"#;
        std::fs::write(&temp_path, invalid_json).unwrap();

        let mut context = VariableContext::new();
        
        // Try to merge invalid JSON
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        
        assert!(result.is_err());
        if let Err(e) = result {
            assert!(e.to_string().contains("Failed to parse JSON"));
        }

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }

    #[test]
    fn test_merge_custom_variables_invalid_yaml() {
        use std::io::Write;
        use tempfile::NamedTempFile;

        // Create a temporary YAML file with invalid content
        let mut temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("yaml");
        let invalid_yaml = r#"
invalid: yaml: content:
  - this is
  - not: valid
    - yaml
"#;
        std::fs::write(&temp_path, invalid_yaml).unwrap();

        let mut context = VariableContext::new();
        
        // Try to merge invalid YAML
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        
        assert!(result.is_err());
        if let Err(e) = result {
            assert!(e.to_string().contains("Failed to parse YAML"));
        }

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }

    #[test]
    fn test_merge_custom_variables_unsupported_extension() {
        use std::io::Write;
        use tempfile::NamedTempFile;

        // Create a temporary file with unsupported extension
        let mut temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("txt");
        std::fs::write(&temp_path, "some content").unwrap();

        let mut context = VariableContext::new();
        
        // Try to merge from unsupported file type
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        
        assert!(result.is_err());
        if let Err(e) = result {
            assert!(e.to_string().contains("Unsupported file extension"));
        }

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }

    #[test]
    fn test_merge_custom_variables_non_object_root() {
        use tempfile::NamedTempFile;

        // Create a temporary JSON file with array at root
        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("json");
        let json_content = r#"["item1", "item2", "item3"]"#;
        std::fs::write(&temp_path, json_content).unwrap();

        let mut context = VariableContext::new();
        
        // Try to merge array at root (should fail)
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        
        assert!(result.is_err());
        if let Err(e) = result {
            assert!(e.to_string().contains("must contain a JSON/YAML object at the root"));
        }

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }

    #[test]
    fn test_merge_custom_variables_yml_extension() {
        use std::io::Write;
        use tempfile::NamedTempFile;

        // Create a temporary file with .yml extension
        let mut temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("yml");
        let yaml_content = r#"
test_key: test_value
number: 123
"#;
        std::fs::write(&temp_path, yaml_content).unwrap();

        let mut context = VariableContext::new();

        // Merge custom variables (should work with .yml extension)
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        assert!(result.is_ok());

        // Verify variables were added
        assert_eq!(context.get("test_key"), Some(&json!("test_value")));
        assert_eq!(context.get("number"), Some(&json!(123)));

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }

    #[test]
    fn test_merge_custom_variables_complex_nested_override() {
        use tempfile::NamedTempFile;

        // Create a context with existing nested structure
        let mut context = VariableContext::new();
        context.insert("resources[0].name".to_string(), json!("original-db"));
        context.insert("resources[0].configuration.engine".to_string(), json!("mysql"));

        // Create a temporary JSON file that overrides nested values
        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("json");
        let json_content = r#"{
            "resources": [
                {
                    "name": "custom-db",
                    "configuration": {
                        "engine": "postgres"
                    }
                }
            ]
        }"#;
        std::fs::write(&temp_path, json_content).unwrap();

        // Merge custom variables
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        assert!(result.is_ok());

        // Verify overrides occurred
        assert_eq!(context.get("resources[0].name"), Some(&json!("custom-db")));
        assert_eq!(context.get("resources[0].configuration.engine"), Some(&json!("postgres")));

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }

    #[test]
    fn test_merge_custom_variables_preserves_types() {
        use tempfile::NamedTempFile;

        // Create a temporary JSON file with various types
        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().with_extension("json");
        let json_content = r#"{
            "string_value": "hello",
            "number_value": 42,
            "float_value": 3.14,
            "boolean_value": true,
            "null_value": null
        }"#;
        std::fs::write(&temp_path, json_content).unwrap();

        let mut context = VariableContext::new();

        // Merge custom variables
        let result = VariableContextBuilder::merge_custom_variables(&mut context, &temp_path);
        assert!(result.is_ok());

        // Verify types are preserved
        assert_eq!(context.get("string_value"), Some(&json!("hello")));
        assert_eq!(context.get("number_value"), Some(&json!(42)));
        assert_eq!(context.get("float_value"), Some(&json!(3.14)));
        assert_eq!(context.get("boolean_value"), Some(&json!(true)));
        assert_eq!(context.get("null_value"), Some(&json!(null)));

        // Cleanup
        std::fs::remove_file(&temp_path).ok();
    }
}
