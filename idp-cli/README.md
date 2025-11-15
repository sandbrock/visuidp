# IDP CLI

A command-line interface tool for generating OpenTofu (Terraform-compatible) infrastructure-as-code from IDP blueprints and stacks.

## Project Status

This project is currently in initial setup phase. The basic project structure and dependencies have been configured.

## Project Structure

```
idp-cli/
├── src/
│   ├── main.rs              # CLI entry point
│   ├── cli.rs               # Command-line argument parsing
│   ├── api_client.rs        # IDP API communication
│   ├── models.rs            # Data structures for API responses
│   ├── generator.rs         # OpenTofu code generation
│   ├── resource_mapper.rs   # Resource type to Terraform mapping
│   ├── file_writer.rs       # File I/O operations
│   └── error.rs             # Error types and handling
├── Cargo.toml               # Project configuration and dependencies
└── README.md                # This file
```

## Dependencies

### Core Dependencies
- **clap** (4.4): CLI argument parsing with derive macros and environment variable support
- **reqwest** (0.11): HTTP client for API communication
- **tokio** (1.35): Async runtime
- **serde** (1.0): JSON serialization/deserialization
- **serde_json** (1.0): JSON handling
- **uuid** (1.6): UUID support with serde integration
- **thiserror** (1.0): Error type derivation
- **anyhow** (1.0): Error handling utilities
- **env_logger** (0.11): Logging implementation
- **log** (0.4): Logging facade

### Development Dependencies
- **mockito** (1.2): HTTP mocking for tests
- **tempfile** (3.8): Temporary directories for testing
- **assert_cmd** (2.0): Command-line testing
- **predicates** (3.0): Assertion predicates

## Building

```bash
# Build the project
cargo build

# Build with optimizations
cargo build --release
```

## Running

```bash
# Run the CLI
cargo run

# Run with arguments
cargo run -- --help
cargo run -- --version
```

## Testing

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture
```

## Development

This project uses Rust 2021 edition and follows standard Rust project conventions.

## Next Steps

The following components need to be implemented:
1. Error handling types
2. Command-line argument parsing
3. Data models for API responses
4. API client for IDP communication
5. Resource type to Terraform mapping
6. HCL code generation
7. File writing operations
8. Main CLI application flow
9. Command handlers for blueprint and stack operations
10. Unit and integration tests
11. Documentation

## License

MIT
