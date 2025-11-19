pub mod cli;
pub mod error;
pub mod api_client;
pub mod models;
pub mod file_writer;
pub mod template_discovery;
pub mod variable_context;
pub mod template_processor;
pub mod s3_client;

// Lambda handler module (only compiled when lambda feature is enabled)
#[cfg(feature = "lambda")]
pub mod lambda_handler;
