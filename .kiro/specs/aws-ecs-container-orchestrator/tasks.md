# Implementation Plan

- [x] 1. Update V2 migration file to use ECS instead of EKS
  - Modify the resource_type_cloud_mappings INSERT statement for Managed Container Orchestrator + AWS to use terraform-aws-ecs module URL instead of terraform-aws-eks
  - Update the section comment from "AWS Managed Container Orchestrator (EKS)" to "AWS Managed Container Orchestrator (ECS)"
  - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2, 9.3_

- [x] 2. Replace EKS property schemas with ECS property schemas in V2 migration
  - [x] 2.1 Remove all existing EKS property INSERT statements
    - Delete the 7 EKS property schema INSERT statements (kubernetesVersion, nodeInstanceType, desiredNodeCount, minNodeCount, maxNodeCount, enableClusterAutoscaler, nodeVolumeSize)
    - _Requirements: 1.2_
  
  - [x] 2.2 Add launchType property schema
    - Write INSERT statement for launchType property with LIST data type, required=true, default="FARGATE", allowedValues=[FARGATE, EC2], display_order=10
    - Include description explaining Fargate vs EC2 launch types
    - Use UUID '04010000-0000-0000-0000-000000000001'
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 14.1, 14.2_
  
  - [x] 2.3 Add taskCpu property schema
    - Write INSERT statement for taskCpu property with LIST data type, required=true, default="512", allowedValues=[256, 512, 1024, 2048, 4096], display_order=20
    - Include description explaining CPU units and valid combinations with memory
    - Use UUID '04010000-0000-0000-0000-000000000002'
    - _Requirements: 3.1, 3.6, 10.1, 10.3, 10.4, 14.1, 14.3_
  
  - [x] 2.4 Add taskMemory property schema
    - Write INSERT statement for taskMemory property with LIST data type, required=true, default="1024", allowedValues=[512, 1024, 2048, 4096, 8192, 16384, 30720], display_order=30
    - Include description explaining memory in MiB and valid combinations with CPU
    - Use UUID '04010000-0000-0000-0000-000000000003'
    - _Requirements: 3.2, 3.6, 10.1, 10.3, 10.4, 14.1, 14.3_
  
  - [x] 2.5 Add desiredTaskCount property schema
    - Write INSERT statement for desiredTaskCount property with NUMBER data type, required=true, default="2", min=1, max=100, display_order=40
    - Include description explaining task count and high availability recommendation
    - Use UUID '04010000-0000-0000-0000-000000000004'
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.1, 10.3, 14.1, 14.4_
  
  - [x] 2.6 Add enableAutoScaling property schema
    - Write INSERT statement for enableAutoScaling property with BOOLEAN data type, required=false, default="false", display_order=50
    - Include description explaining auto-scaling based on CloudWatch metrics
    - Use UUID '04010000-0000-0000-0000-000000000005'
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.1, 10.2, 14.1_
  
  - [x] 2.7 Add minTaskCount property schema
    - Write INSERT statement for minTaskCount property with NUMBER data type, required=false, default="1", min=1, max=100, display_order=60
    - Include description explaining minimum task count for auto-scaling
    - Use UUID '04010000-0000-0000-0000-000000000006'
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.7, 10.1, 10.3, 14.1_
  
  - [x] 2.8 Add maxTaskCount property schema
    - Write INSERT statement for maxTaskCount property with NUMBER data type, required=false, default="10", min=1, max=100, display_order=70
    - Include description explaining maximum task count for auto-scaling
    - Use UUID '04010000-0000-0000-0000-000000000007'
    - _Requirements: 6.2, 6.3, 6.4, 6.6, 6.7, 10.1, 10.3, 14.1_
  
  - [x] 2.9 Add instanceType property schema
    - Write INSERT statement for instanceType property with LIST data type, required=false, default="t3.medium", allowedValues=[t3.small, t3.medium, t3.large, t3.xlarge, m5.large, m5.xlarge, m5.2xlarge, c5.large, c5.xlarge, c5.2xlarge], display_order=80
    - Include description explaining EC2 instance types and that it only applies to EC2 launch type
    - Use UUID '04010000-0000-0000-0000-000000000008'
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 10.1, 10.2, 14.1_

- [x] 3. Verify migration file syntax and structure
  - Review the modified V2__data.sql file for SQL syntax errors
  - Verify all INSERT statements use ON CONFLICT (mapping_id, property_name) DO NOTHING
  - Verify UUIDs are unique and follow the pattern
  - Verify display_order values are sequential with gaps (10, 20, 30, etc.)
  - Verify all required fields are marked as required=true
  - Verify all default values are properly quoted JSON strings
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 12.4_

- [x] 4. Test database migration with clean database
  - Drop and recreate the PostgreSQL database
  - Run Flyway migrations (V1 and V2)
  - Query resource_type_cloud_mappings table to verify terraform-aws-ecs module URL
  - Query property_schemas table to verify 8 ECS properties exist for mapping 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03'
  - Verify no EKS properties exist (kubernetesVersion, nodeInstanceType, etc.)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4_

- [x] 5. Test API endpoints return ECS properties
  - Start the Quarkus application
  - Call GET /v1/blueprints/resource-schema/{managedContainerOrchestratorId}/{awsId}
  - Verify response contains 8 ECS properties in correct order
  - Verify launchType is first property with display_order=10
  - Verify all required properties have required=true
  - Verify all default values are present
  - Verify validation rules are correctly formatted
  - _Requirements: 1.1, 1.3, 8.1, 8.2, 8.3, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 12.4_

- [x] 6. Test frontend dynamic form rendering
  - Start the React development server
  - Navigate to Infrastructure page
  - Create new Blueprint
  - Add Managed Container Orchestrator resource
  - Select AWS as cloud provider
  - Verify dynamic form displays all 8 ECS properties
  - Verify properties appear in correct order (launchType first, instanceType last)
  - Verify default values are pre-populated (FARGATE, 512, 1024, 2, false, 1, 10, t3.medium)
  - Verify required fields show validation when empty
  - Verify dropdown fields show correct allowed values
  - _Requirements: 1.1, 1.3, 1.4, 8.1, 8.2, 8.3, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 12.4, 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 7. Test property validation rules
  - In the dynamic form, test launchType dropdown shows only FARGATE and EC2
  - Test taskCpu dropdown shows only valid CPU values
  - Test taskMemory dropdown shows only valid memory values
  - Test desiredTaskCount accepts values 1-100 and rejects values outside range
  - Test minTaskCount accepts values 1-100 and rejects values outside range
  - Test maxTaskCount accepts values 1-100 and rejects values outside range
  - Test enableAutoScaling toggles between true/false
  - Test instanceType dropdown shows only valid EC2 instance types
  - _Requirements: 2.1, 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 6.1, 6.2, 6.3, 6.4, 7.1, 8.1, 8.2, 8.3, 11.1, 11.2, 11.3, 11.4_

- [x] 8. Test blueprint creation with ECS properties
  - Create a new blueprint with Managed Container Orchestrator resource
  - Configure ECS properties with custom values
  - Save the blueprint
  - Verify blueprint saves successfully
  - Retrieve the blueprint and verify ECS properties are persisted correctly
  - _Requirements: 1.1, 1.3, 1.4, 8.1, 8.2, 8.3, 8.4, 14.5_
