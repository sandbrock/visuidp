# Implementation Plan

- [x] 1. Set up Terraform infrastructure project
  - Create new Terraform project with proper directory structure. Create a terraform directory at the root for modules and shared infrastructure. Create a nested terraform directory at the root of each project (idp-api, idp-ui, idp-cli) for project-specific infrastructure
  - Configure Terraform to use existing backend (S3 + DynamoDB for state locking)
  - Define module structure for compute, database, and frontend
  - Configure Terraform workspaces or separate tfvars for multiple environments (dev, prod)
  - _Requirements: 11.1, 11.4_

- [x] 2. Create DynamoDB single table with Terraform
  - Create Terraform module for single DynamoDB table
  - Define table with PK (partition key) and SK (sort key)
  - Create GSI1 for querying by secondary relationships (e.g., team → stacks)
  - Create GSI2 for querying by type and attributes (e.g., provider → blueprints)
  - Configure on-demand billing mode
  - Enable point-in-time recovery
  - _Requirements: 4.1, 4.2, 4.4, 8.1, 8.4_

- [x] 3. Configure DynamoDB table outputs and IAM policies
  - Output DynamoDB table name and ARN from Terraform module
  - Output GSI names for application use
  - Create IAM policy for Lambda to access DynamoDB table and GSIs
  - Grant permissions for GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan
  - Configure encryption settings for table
  - _Requirements: 4.1, 4.5, 8.4_

- [x] 4. Configure API Gateway HTTP API JWT authorizer for Entra ID
  - Register application in Entra ID if not already done
  - Obtain Entra ID OIDC configuration (issuer URL, audience)
  - Configure HTTP API JWT authorizer with Entra ID issuer and audience
  - Test JWT validation with Entra ID tokens
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Configure Quarkus application for Lambda deployment with DynamoDB
  - Add quarkus-amazon-lambda-http dependency
  - Add AWS SDK for DynamoDB v2 dependency
  - Configure native image build settings
  - Update data access layer to use DynamoDB SDK instead of JPA
  - Implement Parameter Store configuration provider
  - Remove database connection pooling (not needed for DynamoDB)
  - _Requirements: 1.1, 1.4, 4.1, 4.3_

- [x] 6. Implement Entra ID JWT authentication in Quarkus
  - Create EntraIdAuthenticationMechanism to replace TraefikAuthenticationMechanism
  - Implement JWT claims extraction from API Gateway request context
  - Update SecurityIdentity creation to use Entra ID user attributes (email, name, oid)
  - Maintain existing authorization logic
  - _Requirements: 6.3, 6.5, 13.4_

- [x] 6.1 Write property test for authentication enforcement
  - **Property 4: Authentication enforcement**
  - **Validates: Requirements 5.2**

- [x] 6.2 Write property test for JWT validation
  - **Property 5: JWT validation**
  - **Validates: Requirements 6.3**

- [x] 6.3 Write property test for authentication feature parity
  - **Property 10: Authentication feature parity**
  - **Validates: Requirements 13.4**


- [x] 7. Build and package Quarkus native image for Lambda
  - Configure Dockerfile for GraalVM native image build
  - Set up reflection configuration for JPA entities and JAX-RS resources
  - Build native image with container-build
  - Create Lambda container image
  - Push image to Amazon ECR
  - _Requirements: 1.5, 10.2, 10.5_

- [x] 8. Implement Lambda function infrastructure with Terraform
  - Create Terraform module for Lambda function from ECR container image
  - No VPC configuration needed (DynamoDB is AWS managed)
  - Set up environment variable with single DynamoDB table name
  - Configure IAM role with permissions for DynamoDB table and GSIs
  - Set memory and timeout settings
  - Enable ARM64 architecture for cost savings
  - _Requirements: 1.1, 1.2, 1.4, 8.2, 8.3_

- [x] 8.1 Write property test for API timeout compliance
  - **Property 1: API timeout compliance**
  - **Validates: Requirements 1.2**

- [x] 9. Implement API Gateway HTTP API infrastructure with Terraform
  - Create Terraform module for HTTP API with Lambda proxy integration
  - Configure JWT authorizer with Entra ID issuer and audience
  - Set up CORS for CloudFront origin
  - Configure throttling limits
  - Set up custom domain with ACM certificate
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 9.1 Write property test for API routing completeness
  - **Property 3: API routing completeness**
  - **Validates: Requirements 5.1**

- [x] 10. Implement DynamoDB single-table data access layer
  - Create repository interfaces for DynamoDB operations
  - Implement PK/SK key construction for each entity type (STACK#, TEAM#, etc.)
  - Implement CRUD operations using DynamoDB SDK with composite keys
  - Implement query operations using GSI1 and GSI2
  - Add error handling for DynamoDB exceptions (throttling, not found, etc.)
  - Implement retry logic with exponential backoff
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 10.1 Migrate data models to single-table design
  - Update entity classes to include PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK attributes
  - Implement data mappers between domain objects and DynamoDB items
  - Design access patterns for each entity type
  - Implement entity type prefixes (STACK#, TEAM#, BLUEPRINT#, etc.)
  - Handle relationships using GSIs and composite keys
  - _Requirements: 4.1, 13.5_

- [x] 11. Build and optimize React application for S3 deployment
  - Update Vite configuration for CloudFront base path
  - Configure build output for S3 hosting
  - Implement code splitting and lazy loading
  - Optimize bundle size and asset compression
  - Generate production build
  - _Requirements: 2.1_

- [x] 12. Update React application for Entra ID authentication
  - Add MSAL (Microsoft Authentication Library) for Entra ID
  - Implement login flow with Entra ID
  - Implement JWT token management and refresh
  - Update API client to include JWT in Authorization header
  - Handle authentication errors and token expiration
  - _Requirements: 6.1, 6.2, 13.4_

- [x] 13. Implement S3 and CloudFront infrastructure with Terraform
  - Create Terraform module for S3 bucket for UI static assets
  - Configure bucket for static website hosting
  - Create CloudFront distribution with S3 and API Gateway origins
  - Configure cache behaviors for static and dynamic content
  - Set up custom error responses for SPA routing
  - Configure ACM certificate for custom domain
  - _Requirements: 2.2, 2.3, 2.5, 5.5_

- [x] 14. Implement deployment automation for UI
  - Create script to upload built assets to S3
  - Configure appropriate cache headers for assets
  - Implement CloudFront cache invalidation
  - Use versioned filenames for cache busting
  - _Requirements: 2.4, 11.2_

- [x] 14.1 Write integration tests for UI deployment
  - Verify UI loads correctly from CloudFront
  - Test SPA routing with CloudFront error handling
  - Verify API calls route through CloudFront to API Gateway
  - _Requirements: 2.3, 13.2_

- [x] 14.2 Write property test for UI feature parity
  - **Property 8: UI feature parity**
  - **Validates: Requirements 13.2**


- [x] 15. Package Rust CLI for Lambda deployment
  - Add lambda_runtime dependency to Cargo.toml
  - Implement Lambda handler for CLI functionality
  - Configure cross-compilation for Lambda runtime
  - Build release binary
  - Create Lambda deployment package or container image
  - _Requirements: 3.1_

- [x] 16. Implement CLI Lambda infrastructure with Terraform
  - Create Terraform module for CLI Lambda function
  - Configure S3 access for template storage and outputs
  - Set up API Gateway endpoint for CLI invocation
  - Configure appropriate timeout (60 seconds)
  - Set up IAM role with S3 permissions
  - _Requirements: 3.1, 3.5_

- [x] 17. Implement CLI template processing with S3 integration
  - Update CLI to fetch templates from S3
  - Implement output storage to S3 or response return
  - Handle S3 errors and retries
  - Test template processing functionality
  - _Requirements: 3.2, 3.3_

- [x] 17.1 Write property test for CLI timeout compliance
  - **Property 2: CLI timeout compliance**
  - **Validates: Requirements 3.4**

- [x] 17.2 Write property test for CLI capability parity
  - **Property 9: CLI capability parity**
  - **Validates: Requirements 13.3**

- [x] 18. Implement Systems Manager Parameter Store configuration
  - Define parameter structure for application configuration
  - Create parameters in Parameter Store via Terraform
  - Implement configuration loading in Lambda startup
  - Test configuration retrieval
  - _Requirements: 7.1, 7.3_

- [x] 19. Implement cost-optimized CloudWatch logging and monitoring
  - Configure Lambda to send error-level logs only to CloudWatch Logs
  - Set log retention to 3 days (dev) and 7 days (prod) for cost savings
  - Implement structured logging with error details and stack traces
  - Use free AWS service metrics (Lambda, API Gateway, DynamoDB) instead of custom metrics
  - Filter logs at application level before sending to CloudWatch
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 12.4_

- [x] 19.1 Write property test for error logging completeness
  - **Property 6: Error logging completeness**
  - **Validates: Requirements 9.2**

- [x] 20. Implement cost-optimized CloudWatch alarms and dashboards
  - Create maximum 10 alarms (Free Tier limit) for critical issues only
  - Alarms: Lambda errors, API Gateway 5xx errors, DynamoDB throttling
  - Use composite alarms to combine multiple conditions
  - Set up SNS topics for alarm notifications
  - Create maximum 3 dashboards (Free Tier limit) using free service metrics
  - Configure alarm thresholds based on requirements
  - _Requirements: 9.5, 12.4_

- [x] 21. Implement cost optimization configurations
  - Configure S3 lifecycle policies for old objects
  - Optimize Lambda memory settings based on testing
  - Configure CloudFront caching to leverage Free Tier (50GB, 2M requests)
  - Set CloudWatch log retention to 3-7 days (not 30 days)
  - Implement error-level logging filter in application code
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 22. Create deployment pipeline automation
  - Set up CI/CD pipeline for building and deploying all components
  - Implement build phase for Quarkus, React, and Rust
  - Implement package phase for container images and assets
  - Implement deploy phase with Terraform (plan and apply)
  - Add smoke tests to deployment pipeline
  - _Requirements: 11.2, 11.3_
   

- [x] 23. Implement multi-environment support
  - Configure Terraform workspaces or separate tfvars for dev, staging, and production
  - Parameterize environment-specific settings in variables
  - Create environment-specific variable files (dev.tfvars, staging.tfvars, prod.tfvars)
  - Test deployment to dev environment
  - _Requirements: 11.4_

- [x] 24. Implement rollback capabilities
  - Configure Lambda versioning and aliases
  - Document Terraform rollback procedures (revert to previous state)
  - Test rollback to previous version using Terraform
  - Create runbook for rollback scenarios
  - _Requirements: 11.5_

- [x] 25. Checkpoint - Verify infrastructure deployment
  - Ensure all Terraform modules apply successfully
  - Verify all AWS resources are created correctly with terraform state list
  - Check security groups and IAM roles
  - Validate networking configuration
  - Ensure all tests pass, ask the user if questions arise.


- [x] 26. Run integration tests against deployed environment
  - Test all API endpoints end-to-end
  - Verify database operations work correctly
  - Test authentication flow with Cognito
  - Verify UI functionality through CloudFront
  - Test CLI Lambda invocation
  - _Requirements: 13.1, 13.2, 13.3, 13.5_

- [x] 26.1 Write property test for API endpoint parity
  - **Property 7: API endpoint parity**
  - **Validates: Requirements 13.1**

- [x] 26.2 Write property test for database operation parity
  - **Property 11: Database operation parity**
  - **Validates: Requirements 13.5**

- [x] 27. Perform load and performance testing
  - Run load tests with Artillery or k6
  - Measure Lambda cold start times
  - Test Aurora Serverless scaling behavior
  - Verify RDS Proxy connection management
  - Monitor CloudWatch metrics during load
  - _Requirements: 10.1_

- [x] 27.1 Document performance test results
  - Record cold start times
  - Document response times under load
  - Analyze database performance metrics
  - Identify optimization opportunities

- [x] 28. Perform security testing
  - Test Entra ID authentication and authorization
  - Verify JWT validation and token expiration by API Gateway
  - Test OIDC integration with Entra ID
  - Verify VPC security groups and network isolation
  - Confirm no public access to RDS
  - Test HTTPS enforcement
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.4_

- [x] 28.1 Document security test results
  - Record authentication test outcomes
  - Document authorization test results
  - Verify network security configuration
  - Confirm secrets management implementation

- [x] 29. Optimize Lambda configuration based on testing
  - Adjust Lambda memory settings for optimal cost/performance
  - Configure provisioned concurrency if needed for critical endpoints
  - Tune connection pool settings
  - Optimize cold start performance
  - _Requirements: 10.1, 10.3, 12.1_

- [x] 30. Create operational documentation
  - Document deployment procedures
  - Create troubleshooting guide
  - Document monitoring and alerting setup
  - Create runbooks for common operations
  - Document cost optimization strategies
  - _Requirements: 11.2, 11.5_

- [x] 31. Perform cost analysis and optimization
  - Review actual AWS costs after deployment
  - Compare against estimated costs
  - Identify cost optimization opportunities
  - Implement additional cost-saving measures if needed
  - Set up billing alarms
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 32. Implement demo mode for hackathon judges
  - Add DEMO_MODE environment variable configuration
  - Implement authentication bypass when demo mode is enabled
  - Create demo user identity with predefined attributes
  - Implement feature flag logic in authentication mechanism
  - _Requirements: 14.1_

- [x] 33. Create sample data for demo mode
  - Create database migration or seed script with sample stacks
  - Add 3-5 realistic sample stacks across AWS, Azure, and GCP
  - Add 5-10 blueprint templates for common patterns
  - Create sample teams and user assignments
  - Pre-generate Terraform examples for each stack type
  - _Requirements: 14.2_

- [x] 34. Implement demo mode behavior in backend
  - Modify write operations to skip persistence in demo mode (or use separate demo DB)
  - Ensure Terraform generation works without actual deployment
  - Add demo mode indicator to API responses (header or response field)
  - Test all API endpoints work correctly in demo mode
  - _Requirements: 14.3, 14.4_

- [x] 35. Implement demo mode UI indicators
  - Add demo mode detection in React app
  - Display prominent "Demo Mode" banner or badge
  - Add tooltips explaining demo mode limitations
  - Ensure UI clearly indicates no actual deployments will occur
  - _Requirements: 14.5_

- [x] 35.1 Test demo mode end-to-end
  - Verify judges can access without authentication
  - Test all UI features work in demo mode
  - Verify Terraform generation produces valid code
  - Confirm no actual infrastructure is deployed
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 36. Final checkpoint - Production readiness verification
  - Verify all functional requirements are met
  - Confirm all tests pass
  - Validate performance meets targets
  - Verify security requirements are satisfied
  - Confirm cost is within budget
  - Verify demo mode works for hackathon judges
  - Review operational documentation
  - Ensure all tests pass, ask the user if questions arise.
