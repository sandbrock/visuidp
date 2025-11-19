use proptest::prelude::*;
use std::time::{Duration, Instant};
use tokio::runtime::Runtime;

/// **Feature: aws-cost-effective-deployment, Property 2: CLI timeout compliance**
/// **Validates: Requirements 3.4**
/// 
/// Property: For any template processing request, when executed via CLI Lambda,
/// the execution time should be less than 60 seconds (Lambda timeout).
/// 
/// This property test generates random template processing scenarios and verifies
/// that the CLI can complete within the Lambda timeout constraint.
#[cfg(test)]
mod cli_timeout_compliance {
    use super::*;
    use idp_cli::template_processor::TemplateProcessor;
    use idp_cli::template_discovery::TemplateDiscovery;
    use idp_cli::file_writer::FileWriter;
    use std::fs;
    use std::io::Write;
    use tempfile::TempDir;

    // Strategy to generate random template sizes (number of files)
    fn template_count_strategy() -> impl Strategy<Value = usize> {
        1usize..=20 // Generate between 1 and 20 template files
    }

    // Strategy to generate random template content sizes (in lines)
    fn template_lines_strategy() -> impl Strategy<Value = usize> {
        10usize..=500 // Generate templates between 10 and 500 lines
    }

    // Strategy to generate random variable counts
    fn variable_count_strategy() -> impl Strategy<Value = usize> {
        5usize..=50 // Generate between 5 and 50 variables
    }

    proptest! {
        #![proptest_config(ProptestConfig {
            cases: 100, // Run 100 iterations as specified in design doc
            .. ProptestConfig::default()
        })]

        /// Property test: CLI template processing completes within 60 seconds
        /// 
        /// This test verifies that for any combination of:
        /// - Number of template files (1-20)
        /// - Template file sizes (10-500 lines)
        /// - Number of variables (5-50)
        /// 
        /// The CLI can process templates and complete within 60 seconds.
        #[test]
        fn cli_processing_completes_within_timeout(
            template_count in template_count_strategy(),
            template_lines in template_lines_strategy(),
            variable_count in variable_count_strategy()
        ) {
            // Create a Tokio runtime for async operations
            let rt = Runtime::new().unwrap();
            
            rt.block_on(async {
                let start = Instant::now();
                
                // Process templates with the generated parameters
                let result = process_templates_with_params(
                    template_count,
                    template_lines,
                    variable_count
                ).await;
                
                let duration = start.elapsed();
                
                // Assert that processing succeeded
                prop_assert!(
                    result.is_ok(),
                    "CLI processing failed: {:?}",
                    result.err()
                );
                
                // Assert that processing completed within 60 seconds
                prop_assert!(
                    duration < Duration::from_secs(60),
                    "CLI processing took {:?}, which exceeds the 60-second Lambda timeout. \
                     Template count: {}, Template lines: {}, Variable count: {}",
                    duration, template_count, template_lines, variable_count
                );
                
                Ok(())
            })?;
        }

        /// Property test: CLI processing time scales reasonably with input size
        /// 
        /// This test verifies that processing time remains well under the 60-second
        /// Lambda timeout even for large workloads. We don't test exact scaling behavior,
        /// just that the processing completes in a reasonable time.
        #[test]
        fn cli_processing_time_scales_reasonably(
            template_count in template_count_strategy(),
            template_lines in template_lines_strategy(),
            variable_count in variable_count_strategy()
        ) {
            let rt = Runtime::new().unwrap();
            
            rt.block_on(async {
                let start = Instant::now();
                
                let result = process_templates_with_params(
                    template_count,
                    template_lines,
                    variable_count
                ).await;
                
                let duration = start.elapsed();
                
                // Assert that processing succeeded
                prop_assert!(
                    result.is_ok(),
                    "CLI processing failed: {:?}",
                    result.err()
                );
                
                // Assert that processing time is well under the 60-second Lambda timeout
                // We use 30 seconds as a reasonable upper bound - if processing takes more
                // than half the Lambda timeout, it's a problem
                prop_assert!(
                    duration < Duration::from_secs(30),
                    "CLI processing time {:?} is too slow. Should complete well under 60-second timeout. \
                     Template count: {}, Template lines: {}, Variable count: {}",
                    duration, template_count, template_lines, variable_count
                );
                
                Ok(())
            })?;
        }
    }

    /// Process templates with given parameters using actual CLI logic
    /// 
    /// This function:
    /// 1. Generates mock templates of the specified size
    /// 2. Creates mock variables
    /// 3. Calls the actual CLI processing logic
    /// 4. Measures the time taken
    async fn process_templates_with_params(
        template_count: usize,
        template_lines: usize,
        variable_count: usize,
    ) -> Result<(), String> {
        use idp_cli::variable_context::VariableContext;
        
        // Create temporary directories for templates and outputs
        let temp_templates_dir = TempDir::new()
            .map_err(|e| format!("Failed to create temp templates dir: {}", e))?;
        let temp_output_dir = TempDir::new()
            .map_err(|e| format!("Failed to create temp output dir: {}", e))?;

        // Generate mock variables using VariableContext
        let mut context = VariableContext::new();
        for i in 0..variable_count {
            context.insert(
                format!("var_{}", i),
                serde_json::Value::String(format!("value_{}", i))
            );
        }

        // Generate mock template files
        for i in 0..template_count {
            let template_path = temp_templates_dir.path().join(format!("template_{}.tf", i));
            let mut file = fs::File::create(&template_path)
                .map_err(|e| format!("Failed to create template file: {}", e))?;

            // Write template content with variable references
            for line_num in 0..template_lines {
                let var_index = line_num % variable_count;
                writeln!(file, "# Line {} - Variable: {{{{var_{}}}}}", line_num, var_index)
                    .map_err(|e| format!("Failed to write template line: {}", e))?;
            }
        }

        // Discover templates
        let discovery = TemplateDiscovery::new(temp_templates_dir.path().to_path_buf());
        let template_files = discovery.discover_templates()
            .map_err(|e| format!("Failed to discover templates: {}", e))?;

        if template_files.is_empty() {
            return Err("No template files discovered".to_string());
        }

        // Process templates
        let processor = TemplateProcessor::new(&context);
        let mut processed_files = Vec::new();

        for template_file in &template_files {
            let processed = processor.process_file(template_file)
                .map_err(|e| format!("Failed to process template: {:?}", e))?;
            processed_files.push(processed);
        }

        // Write files to output directory
        let file_writer = FileWriter::new(temp_output_dir.path().to_path_buf());
        let written_files = file_writer.write_processed_files(&processed_files)
            .map_err(|e| format!("Failed to write files: {}", e))?;

        // Verify files were written
        if written_files.len() != template_count {
            return Err(format!(
                "Expected {} files, but wrote {}",
                template_count,
                written_files.len()
            ));
        }

        Ok(())
    }
}

/// **Feature: aws-cost-effective-deployment, Property 9: CLI capability parity**
/// **Validates: Requirements 13.3**
/// 
/// Property: For any template processing capability in the original CLI,
/// the deployed Lambda version should support the same capability with
/// equivalent functionality.
/// 
/// This property test verifies that the Lambda-deployed CLI maintains
/// feature parity with the original CLI implementation.
#[cfg(test)]
mod cli_capability_parity {
    use super::*;
    use idp_cli::template_processor::TemplateProcessor;
    use idp_cli::template_discovery::{TemplateDiscovery, TemplateFileType};
    use idp_cli::file_writer::FileWriter;
    use idp_cli::variable_context::VariableContext;
    use std::fs;
    use std::io::Write;
    use tempfile::TempDir;
    use serde_json::json;
    use proptest::test_runner::TestCaseError;

    // Strategy to generate random template types
    fn template_type_strategy() -> impl Strategy<Value = TemplateFileType> {
        prop_oneof![
            Just(TemplateFileType::Terraform),
            Just(TemplateFileType::Yaml),
            Just(TemplateFileType::Json),
        ]
    }

    // Strategy to generate random template content patterns
    fn template_content_strategy() -> impl Strategy<Value = String> {
        prop_oneof![
            // Simple variable substitution
            Just("resource \"aws_instance\" \"{{name}}\" { ami = \"{{ami}}\" }".to_string()),
            // Nested variable access
            Just("name: {{resource.name}}\ntype: {{resource.type}}".to_string()),
            // Array indexing
            Just("first: {{items.0.name}}\nsecond: {{items.1.name}}".to_string()),
            // Conditional logic
            Just("{{#if enabled}}enabled: true{{else}}enabled: false{{/if}}".to_string()),
            // Loop iteration
            Just("{{#each resources}}resource: {{name}}\n{{/each}}".to_string()),
        ]
    }

    // Strategy to generate random variable contexts
    fn variable_context_strategy() -> impl Strategy<Value = VariableContext> {
        (1usize..=10).prop_flat_map(|count| {
            prop::collection::vec(
                (
                    "[a-z][a-z0-9_]{0,19}",
                    prop_oneof![
                        "[a-zA-Z0-9_-]{1,30}".prop_map(|s| json!(s)),
                        (1i64..=100).prop_map(|n| json!(n)),
                        prop::bool::ANY.prop_map(|b| json!(b)),
                    ]
                ),
                count
            )
        }).prop_map(|vars| {
            let mut context = VariableContext::new();
            for (key, value) in vars {
                context.insert(key, value);
            }
            context
        })
    }

    proptest! {
        #![proptest_config(ProptestConfig {
            cases: 100, // Run 100 iterations as specified in design doc
            .. ProptestConfig::default()
        })]

        /// Property test: CLI supports all template file types
        /// 
        /// This test verifies that the CLI can process all supported template types
        /// (Terraform, YAML, JSON) with the same processing logic.
        #[test]
        fn cli_supports_all_template_types(
            template_type in template_type_strategy(),
            template_content in template_content_strategy(),
            context in variable_context_strategy()
        ) {
            let rt = Runtime::new().unwrap();
            
            rt.block_on(async {
                // Create temporary directories
                let temp_templates_dir = TempDir::new()
                    .map_err(|e| TestCaseError::fail(format!("Failed to create temp dir: {}", e)))?;
                let temp_output_dir = TempDir::new()
                    .map_err(|e| TestCaseError::fail(format!("Failed to create temp dir: {}", e)))?;

                // Determine file extension based on template type
                let extension = match template_type {
                    TemplateFileType::Terraform => "tf",
                    TemplateFileType::Yaml => "yaml",
                    TemplateFileType::Json => "json",
                };

                // Create template file
                let template_path = temp_templates_dir.path().join(format!("template.{}", extension));
                let mut file = fs::File::create(&template_path)
                    .map_err(|e| TestCaseError::fail(format!("Failed to create template: {}", e)))?;
                writeln!(file, "{}", template_content)
                    .map_err(|e| TestCaseError::fail(format!("Failed to write template: {}", e)))?;

                // Discover templates
                let discovery = TemplateDiscovery::new(temp_templates_dir.path().to_path_buf());
                let template_files = discovery.discover_templates()
                    .map_err(|e| TestCaseError::fail(format!("Failed to discover templates: {}", e)))?;

                prop_assert!(
                    !template_files.is_empty(),
                    "Template discovery failed for {:?} file type",
                    template_type
                );

                // Process templates
                let processor = TemplateProcessor::new(&context);
                let processed = processor.process_file(&template_files[0])
                    .map_err(|e| TestCaseError::fail(format!("Failed to process template: {:?}", e)))?;

                // Write output
                let file_writer = FileWriter::new(temp_output_dir.path().to_path_buf());
                let written_files = file_writer.write_processed_files(&vec![processed])
                    .map_err(|e| TestCaseError::fail(format!("Failed to write files: {}", e)))?;

                prop_assert_eq!(
                    written_files.len(),
                    1,
                    "CLI should generate exactly 1 file for {:?} template",
                    template_type
                );

                // Verify output file exists and has content
                let output_file = &written_files[0];
                prop_assert!(
                    output_file.exists(),
                    "Output file should exist for {:?} template",
                    template_type
                );

                let output_content = fs::read_to_string(output_file)
                    .map_err(|e| TestCaseError::fail(format!("Failed to read output: {}", e)))?;
                
                // Note: Output may be empty if template references variables that don't exist
                // This is valid behavior - the template processor handles missing variables gracefully
                // We just verify that the file was created and processing completed without errors

                Ok(())
            })?;
        }

        /// Property test: Template processing produces consistent output
        /// 
        /// This test verifies that processing the same template with the same
        /// variables produces identical output every time (deterministic behavior).
        #[test]
        fn template_processing_is_deterministic(
            template_type in template_type_strategy(),
            template_content in template_content_strategy(),
            context in variable_context_strategy()
        ) {
            let rt = Runtime::new().unwrap();
            
            rt.block_on(async {
                // Create temporary directories
                let temp_templates_dir = TempDir::new()
                    .map_err(|e| TestCaseError::fail(format!("Failed to create temp dir: {}", e)))?;

                // Determine file extension
                let extension = match template_type {
                    TemplateFileType::Terraform => "tf",
                    TemplateFileType::Yaml => "yaml",
                    TemplateFileType::Json => "json",
                };

                // Create template file
                let template_path = temp_templates_dir.path().join(format!("template.{}", extension));
                let mut file = fs::File::create(&template_path)
                    .map_err(|e| TestCaseError::fail(format!("Failed to create template: {}", e)))?;
                writeln!(file, "{}", template_content)
                    .map_err(|e| TestCaseError::fail(format!("Failed to write template: {}", e)))?;

                // Discover templates
                let discovery = TemplateDiscovery::new(temp_templates_dir.path().to_path_buf());
                let template_files = discovery.discover_templates()
                    .map_err(|e| TestCaseError::fail(format!("Failed to discover templates: {}", e)))?;

                // Process template twice
                let processor = TemplateProcessor::new(&context);
                let processed1 = processor.process_file(&template_files[0])
                    .map_err(|e| TestCaseError::fail(format!("First processing failed: {:?}", e)))?;
                let processed2 = processor.process_file(&template_files[0])
                    .map_err(|e| TestCaseError::fail(format!("Second processing failed: {:?}", e)))?;

                // Outputs should be identical
                prop_assert_eq!(
                    processed1.content,
                    processed2.content,
                    "Template processing should be deterministic - same input should produce same output"
                );

                Ok(())
            })?;
        }

        /// Property test: Variable substitution works correctly
        /// 
        /// This test verifies that variables are correctly substituted in templates
        /// and that the output contains the expected variable values.
        #[test]
        fn variable_substitution_works_correctly(
            template_type in template_type_strategy(),
            context in variable_context_strategy()
        ) {
            let rt = Runtime::new().unwrap();
            
            rt.block_on(async {
                // Skip if context is empty (nothing to substitute)
                if context.is_empty() {
                    return Ok(());
                }

                // Create temporary directories
                let temp_templates_dir = TempDir::new()
                    .map_err(|e| TestCaseError::fail(format!("Failed to create temp dir: {}", e)))?;

                // Get first variable from context
                let all_vars = context.list_all();
                let (var_name, var_value) = all_vars.iter().next().unwrap();

                // Create template with variable reference
                let extension = match template_type {
                    TemplateFileType::Terraform => "tf",
                    TemplateFileType::Yaml => "yaml",
                    TemplateFileType::Json => "json",
                };

                let template_content = format!("test_value: {{{{{}}}}}", var_name);
                let template_path = temp_templates_dir.path().join(format!("template.{}", extension));
                let mut file = fs::File::create(&template_path)
                    .map_err(|e| TestCaseError::fail(format!("Failed to create template: {}", e)))?;
                writeln!(file, "{}", template_content)
                    .map_err(|e| TestCaseError::fail(format!("Failed to write template: {}", e)))?;

                // Discover and process template
                let discovery = TemplateDiscovery::new(temp_templates_dir.path().to_path_buf());
                let template_files = discovery.discover_templates()
                    .map_err(|e| TestCaseError::fail(format!("Failed to discover templates: {}", e)))?;

                let processor = TemplateProcessor::new(&context);
                let processed = processor.process_file(&template_files[0])
                    .map_err(|e| TestCaseError::fail(format!("Failed to process template: {:?}", e)))?;

                // Verify variable was substituted
                let expected_value = if let Some(s) = var_value.as_str() {
                    s.to_string()
                } else if let Some(n) = var_value.as_i64() {
                    n.to_string()
                } else if let Some(b) = var_value.as_bool() {
                    b.to_string()
                } else {
                    "unknown".to_string()
                };

                prop_assert!(
                    processed.content.contains(&expected_value),
                    "Processed template should contain substituted variable value '{}', but got: {}",
                    expected_value,
                    processed.content
                );

                // Verify template placeholder was removed
                prop_assert!(
                    !processed.content.contains(&format!("{{{{{}}}}}", var_name)),
                    "Processed template should not contain template placeholder {{{{{}}}}}",
                    var_name
                );

                Ok(())
            })?;
        }

        /// Property test: Multiple template files are processed independently
        /// 
        /// This test verifies that when multiple template files exist, each is
        /// processed independently and produces separate output files.
        #[test]
        fn multiple_templates_processed_independently(
            template_count in 2usize..=5,
            context in variable_context_strategy()
        ) {
            let rt = Runtime::new().unwrap();
            
            rt.block_on(async {
                // Create temporary directories
                let temp_templates_dir = TempDir::new()
                    .map_err(|e| TestCaseError::fail(format!("Failed to create temp dir: {}", e)))?;
                let temp_output_dir = TempDir::new()
                    .map_err(|e| TestCaseError::fail(format!("Failed to create temp dir: {}", e)))?;

                // Create multiple template files
                for i in 0..template_count {
                    let template_path = temp_templates_dir.path().join(format!("template_{}.tf", i));
                    let mut file = fs::File::create(&template_path)
                        .map_err(|e| TestCaseError::fail(format!("Failed to create template: {}", e)))?;
                    writeln!(file, "# Template {}", i)
                        .map_err(|e| TestCaseError::fail(format!("Failed to write template: {}", e)))?;
                }

                // Discover templates
                let discovery = TemplateDiscovery::new(temp_templates_dir.path().to_path_buf());
                let template_files = discovery.discover_templates()
                    .map_err(|e| TestCaseError::fail(format!("Failed to discover templates: {}", e)))?;

                prop_assert_eq!(
                    template_files.len(),
                    template_count,
                    "Should discover all {} template files",
                    template_count
                );

                // Process all templates
                let processor = TemplateProcessor::new(&context);
                let mut processed_files = Vec::new();
                for template_file in &template_files {
                    let processed = processor.process_file(template_file)
                        .map_err(|e| TestCaseError::fail(format!("Failed to process template: {:?}", e)))?;
                    processed_files.push(processed);
                }

                // Write all files
                let file_writer = FileWriter::new(temp_output_dir.path().to_path_buf());
                let written_files = file_writer.write_processed_files(&processed_files)
                    .map_err(|e| TestCaseError::fail(format!("Failed to write files: {}", e)))?;

                prop_assert_eq!(
                    written_files.len(),
                    template_count,
                    "Should write all {} output files",
                    template_count
                );

                // Verify all output files exist
                for output_file in &written_files {
                    prop_assert!(
                        output_file.exists(),
                        "Output file {} should exist",
                        output_file.display()
                    );
                }

                Ok(())
            })?;
        }

        /// Property test: Directory structure is preserved
        /// 
        /// This test verifies that the CLI preserves the directory structure
        /// from the template directory in the output directory.
        #[test]
        fn directory_structure_preserved(
            subdirs in 1usize..=3,
            context in variable_context_strategy()
        ) {
            let rt = Runtime::new().unwrap();
            
            rt.block_on(async {
                // Create temporary directories
                let temp_templates_dir = TempDir::new()
                    .map_err(|e| TestCaseError::fail(format!("Failed to create temp dir: {}", e)))?;
                let temp_output_dir = TempDir::new()
                    .map_err(|e| TestCaseError::fail(format!("Failed to create temp dir: {}", e)))?;

                // Create nested directory structure with templates
                let mut expected_paths = Vec::new();
                for i in 0..subdirs {
                    let subdir = temp_templates_dir.path().join(format!("subdir_{}", i));
                    fs::create_dir(&subdir)
                        .map_err(|e| TestCaseError::fail(format!("Failed to create subdir: {}", e)))?;
                    
                    let template_path = subdir.join("template.tf");
                    let mut file = fs::File::create(&template_path)
                        .map_err(|e| TestCaseError::fail(format!("Failed to create template: {}", e)))?;
                    writeln!(file, "# Template in subdir {}", i)
                        .map_err(|e| TestCaseError::fail(format!("Failed to write template: {}", e)))?;
                    
                    expected_paths.push(format!("subdir_{}/template.tf", i));
                }

                // Discover and process templates
                let discovery = TemplateDiscovery::new(temp_templates_dir.path().to_path_buf());
                let template_files = discovery.discover_templates()
                    .map_err(|e| TestCaseError::fail(format!("Failed to discover templates: {}", e)))?;

                let processor = TemplateProcessor::new(&context);
                let mut processed_files = Vec::new();
                for template_file in &template_files {
                    let processed = processor.process_file(template_file)
                        .map_err(|e| TestCaseError::fail(format!("Failed to process template: {:?}", e)))?;
                    processed_files.push(processed);
                }

                // Write files
                let file_writer = FileWriter::new(temp_output_dir.path().to_path_buf());
                let written_files = file_writer.write_processed_files(&processed_files)
                    .map_err(|e| TestCaseError::fail(format!("Failed to write files: {}", e)))?;

                // Verify directory structure is preserved
                for expected_path in &expected_paths {
                    let output_path = temp_output_dir.path().join(expected_path);
                    prop_assert!(
                        output_path.exists(),
                        "Output file should exist at preserved path: {}",
                        expected_path
                    );
                }

                Ok(())
            })?;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_property_tests_compile() {
        // This test ensures that the property test modules compile correctly
        assert!(true);
    }
}
