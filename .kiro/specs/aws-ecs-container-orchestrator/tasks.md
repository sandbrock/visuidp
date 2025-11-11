# Implementation Plan

- [x] 1. Update V2 migration file to use ECS cluster module
  - Modify the resource_type_cloud_mappings INSERT statement for Managed Container Orchestrator + AWS to use terraform-aws-ecs module URL
  - Update the section comment from "AWS Managed Container Orchestrator (EKS)" to "AWS Managed Container Orchestrator (ECS Cluster)"
  - Ensure module configuration focuses on cluster provisioning only, not task definitions
  - _Requirements: 1.1, 1.2, 1.3, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Replace EKS property schemas with ECS cluster property schemas in V2 migration
  - [x] 2.1 Remove all existing EKS property INSERT statements
    - Delete the 7 EKS property schema INSERT statements (kubernetesVersion, nodeInstanceType, desiredNodeCount, minNodeCount, maxNodeCount, enableClusterAutoscaler, nodeVolumeSize)
    - _Requirements: 1.2_
  
  - [x] 2.2 Add capacityProvider property schema
    - Write INSERT statement for capacityProvider property with LIST data type, required=true, default="FARGATE", allowedValues=[FARGATE, FARGATE_SPOT, EC2], display_order=10
    - Include description explaining Fargate, Fargate Spot, and EC2 capacity providers
    - Use UUID '04010000-0000-0000-0000-000000000001'
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.2, 9.4, 13.1, 13.2_
  
  - [x] 2.3 Add instanceType property schema
    - Write INSERT statement for instanceType property with LIST data type, required=false, default="t3.medium", allowedValues=[t3.small, t3.medium, t3.large, t3.xlarge, m5.large, m5.xlarge, m5.2xlarge, c5.large, c5.xlarge, c5.2xlarge], display_order=20
    - Include description explaining EC2 instance types and that it only applies to EC2 capacity provider
    - Use UUID '04010000-0000-0000-0000-000000000002'
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.2, 9.4, 13.1_
  
  - [x] 2.4 Add minClusterSize property schema
    - Write INSERT statement for minClusterSize property with NUMBER data type, required=false, default="1", min=0, max=100, display_order=30
    - Include description explaining minimum cluster size for EC2 capacity provider
    - Use UUID '04010000-0000-0000-0000-000000000003'
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.1, 9.3, 13.1, 13.4_
  
  - [x] 2.5 Add maxClusterSize property schema
    - Write INSERT statement for maxClusterSize property with NUMBER data type, required=false, default="10", min=1, max=100, display_order=40
    - Include description explaining maximum cluster size for EC2 capacity provider
    - Use UUID '04010000-0000-0000-0000-000000000004'
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 9.1, 9.3, 13.1, 13.4_
  
  - [x] 2.6 Add enableContainerInsights property schema
    - Write INSERT statement for enableContainerInsights property with BOOLEAN data type, required=false, default="true", display_order=50
    - Include description explaining CloudWatch Container Insights monitoring
    - Use UUID '04010000-0000-0000-0000-000000000005'
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.2, 13.1, 13.3_

- [x] 3. Verify migration file syntax and structure
  - Review the modified V2__data.sql file for SQL syntax errors
  - Verify all INSERT statements use ON CONFLICT (mapping_id, property_name) DO NOTHING
  - Verify UUIDs are unique and follow the pattern
  - Verify display_order values are sequential with gaps (10, 20, 30, 40, 50)
  - Verify only capacityProvider is marked as required=true
  - Verify all default values are properly quoted JSON strings
  - Verify EC2-specific properties (instanceType, minClusterSize, maxClusterSize) are marked as optional
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4_

- [x] 4. Test database migration with clean database
  - Drop and recreate the PostgreSQL database
  - Run Flyway migrations (V1 and V2)
  - Query resource_type_cloud_mappings table to verify terraform-aws-ecs module URL
  - Query property_schemas table to verify 5 ECS cluster properties exist for mapping 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03'
  - Verify no EKS properties exist (kubernetesVersion, nodeInstanceType, etc.)
  - Verify no task-level properties exist (taskCpu, taskMemory, desiredTaskCount, etc.)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5. Test API endpoints return ECS cluster properties
  - Start the Quarkus application
  - Call GET /v1/blueprints/resource-schema/{managedContainerOrchestratorId}/{awsId}
  - Verify response contains 5 ECS cluster properties in correct order
  - Verify capacityProvider is first property with display_order=10
  - Verify only capacityProvider has required=true
  - Verify all default values are present
  - Verify validation rules are correctly formatted
  - _Requirements: 1.1, 1.3, 7.1, 7.2, 7.3, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4_

- [x] 6. Test frontend dynamic form rendering for blueprints
  - Start the React development server
  - Navigate to Infrastructure page
  - Create new Blueprint
  - Add Managed Container Orchestrator resource
  - Select AWS as cloud provider
  - Verify dynamic form displays all 5 ECS cluster properties
  - Verify properties appear in correct order (capacityProvider first, enableContainerInsights last)
  - Verify default values are pre-populated (FARGATE, t3.medium, 1, 10, true)
  - Verify only capacityProvider shows validation when empty
  - Verify dropdown fields show correct allowed values
  - _Requirements: 1.1, 1.3, 1.4, 7.1, 7.2, 7.3, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 7. Test capacity provider conditional logic
  - In the dynamic form, select FARGATE capacity provider
  - Verify EC2-specific fields (instanceType, minClusterSize, maxClusterSize) are hidden or disabled
  - Select EC2 capacity provider
  - Verify EC2-specific fields become visible and enabled
  - Verify instanceType dropdown shows only valid EC2 instance types
  - Verify minClusterSize accepts values 0-100
  - Verify maxClusterSize accepts values 1-100
  - Test that maxClusterSize must be >= minClusterSize
  - _Requirements: 2.1, 3.1, 3.4, 4.1, 4.2, 4.3, 4.6, 5.1, 5.2, 5.3, 5.6, 9.4, 10.1, 10.2, 10.3, 10.5_

- [x] 8. Test blueprint creation with ECS cluster properties
  - Create a new blueprint with Managed Container Orchestrator resource
  - Configure ECS cluster properties with FARGATE capacity provider
  - Save the blueprint
  - Verify blueprint saves successfully
  - Retrieve the blueprint and verify ECS cluster properties are persisted correctly
  - Create another blueprint with EC2 capacity provider and custom cluster sizes
  - Verify EC2-specific properties are saved and retrieved correctly
  - _Requirements: 1.1, 1.3, 1.4, 7.1, 7.2, 7.3, 7.6, 12.1, 12.2, 12.3, 12.4, 13.5_

- [x] 9. Verify no task-level properties in blueprint forms
  - Review the blueprint creation form
  - Verify taskCpu, taskMemory, desiredTaskCount properties are NOT present
  - Verify enableAutoScaling, minTaskCount, maxTaskCount properties are NOT present
  - Confirm only cluster-level infrastructure properties are displayed
  - Document that task properties will be configured at stack level in future work
  - _Requirements: 1.3, 7.6_
