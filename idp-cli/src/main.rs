use clap::Parser;
use log::{error, info};
use std::process;

mod cli;
mod api_client;
mod models;
mod generator;
mod resource_mapper;
mod file_writer;
mod error;

use api_client::ApiClient;
use cli::{CliArgs, Command};
use error::CliError;
use file_writer::FileWriter;
use generator::CodeGenerator;

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
        Command::Blueprint { identifier } => {
            info!("Generating OpenTofu code from blueprint: {}", identifier);
            handle_blueprint(&identifier, &api_client, &output_dir).await?;
        }
        Command::Stack { identifier } => {
            info!("Generating OpenTofu code from stack: {}", identifier);
            handle_stack(&identifier, &api_client, &output_dir).await?;
        }
        Command::Version => {
            // Already handled above, but included for completeness
            unreachable!("Version command should have been handled earlier");
        }
    }

    Ok(())
}

/// Handle blueprint command
async fn handle_blueprint(
    identifier: &str,
    api_client: &ApiClient,
    output_dir: &std::path::Path,
) -> Result<(), CliError> {
    // Fetch blueprint from API
    info!("Fetching blueprint from API...");
    let blueprint = api_client.get_blueprint(identifier).await?;
    info!("Successfully retrieved blueprint: {}", blueprint.name);

    // Generate OpenTofu code
    info!("Generating OpenTofu configuration...");
    let generator = CodeGenerator::new();
    let generated_code = generator.generate_from_blueprint(&blueprint);

    // Write files to output directory
    info!("Writing files to {}...", output_dir.display());
    let file_writer = FileWriter::new(output_dir.to_path_buf());
    let written_files = file_writer.write_generated_code(&generated_code)?;

    // Display success message
    println!("\n✓ Successfully generated OpenTofu code from blueprint '{}'", blueprint.name);
    println!("\nGenerated files:");
    for file_path in written_files {
        println!("  - {}", file_path.display());
    }
    println!("\nNext steps:");
    println!("  1. cd {}", output_dir.display());
    println!("  2. terraform init");
    println!("  3. terraform plan");

    Ok(())
}

/// Handle stack command
async fn handle_stack(
    identifier: &str,
    api_client: &ApiClient,
    output_dir: &std::path::Path,
) -> Result<(), CliError> {
    // Fetch stack from API
    info!("Fetching stack from API...");
    let stack = api_client.get_stack(identifier).await?;
    info!("Successfully retrieved stack: {}", stack.name);

    // Generate OpenTofu code
    info!("Generating OpenTofu configuration...");
    let generator = CodeGenerator::new();
    let generated_code = generator.generate_from_stack(&stack);

    // Write files to output directory
    info!("Writing files to {}...", output_dir.display());
    let file_writer = FileWriter::new(output_dir.to_path_buf());
    let written_files = file_writer.write_generated_code(&generated_code)?;

    // Display success message
    println!("\n✓ Successfully generated OpenTofu code from stack '{}'", stack.name);
    println!("\nGenerated files:");
    for file_path in written_files {
        println!("  - {}", file_path.display());
    }
    println!("\nNext steps:");
    println!("  1. cd {}", output_dir.display());
    println!("  2. terraform init");
    println!("  3. terraform plan");

    Ok(())
}

/// Log error details for debugging
fn log_error(error: &CliError) {
    error!("Error occurred: {:?}", error);
}
