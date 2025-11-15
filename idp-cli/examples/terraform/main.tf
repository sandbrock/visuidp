# Main Terraform Configuration
# Generated from IDP Blueprint/Stack

# This template demonstrates:
# - Looping over resources
# - Conditional resource creation
# - Nested property access
# - Cloud-specific configurations

{{!-- Loop through all resources in the blueprint/stack --}}
{{#each resources}}

{{!-- Conditional: AWS RDS Database --}}
{{#if (eq this.resource_type.name "RelationalDatabaseServer")}}
{{#if (eq this.cloud_provider.name "AWS")}}
resource "aws_db_instance" "{{this.name}}" {
  identifier     = "{{this.name}}"
  engine         = "{{this.cloud_specific_properties.engine|default:"postgres"}}"
  engine_version = "{{this.cloud_specific_properties.engine_version|default:"14.7"}}"
  instance_class = "{{this.cloud_specific_properties.instance_class|default:"db.t3.micro"}}"
  
  allocated_storage     = {{this.cloud_specific_properties.allocated_storage|default:"20"}}
  storage_type          = "{{this.cloud_specific_properties.storage_type|default:"gp2"}}"
  storage_encrypted     = {{this.cloud_specific_properties.storage_encrypted|default:"true"}}
  
  db_name  = "{{this.cloud_specific_properties.database_name|default:"appdb"}}"
  username = "{{this.cloud_specific_properties.master_username|default:"admin"}}"
  password = var.db_password_{{this.name}}
  
  skip_final_snapshot = {{this.cloud_specific_properties.skip_final_snapshot|default:"true"}}
  
  tags = {
    Name        = "{{this.name}}"
    ManagedBy   = "IDP"
    Blueprint   = "{{../blueprint.name}}"
    Environment = var.environment
  }
}
{{/if}}
{{/if}}

{{!-- Conditional: Azure SQL Database --}}
{{#if (eq this.resource_type.name "RelationalDatabaseServer")}}
{{#if (eq this.cloud_provider.name "Azure")}}
resource "azurerm_mssql_server" "{{this.name}}" {
  name                         = "{{this.name}}"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "{{this.cloud_specific_properties.version|default:"12.0"}}"
  administrator_login          = "{{this.cloud_specific_properties.admin_username|default:"sqladmin"}}"
  administrator_login_password = var.db_password_{{this.name}}
  
  tags = {
    Name        = "{{this.name}}"
    ManagedBy   = "IDP"
    Blueprint   = "{{../blueprint.name}}"
    Environment = var.environment
  }
}

resource "azurerm_mssql_database" "{{this.name}}" {
  name      = "{{this.cloud_specific_properties.database_name|default:"appdb"}}"
  server_id = azurerm_mssql_server.{{this.name}}.id
  sku_name  = "{{this.cloud_specific_properties.sku_name|default:"S0"}}"
  
  tags = {
    Name        = "{{this.name}}"
    ManagedBy   = "IDP"
    Blueprint   = "{{../blueprint.name}}"
    Environment = var.environment
  }
}
{{/if}}
{{/if}}

{{!-- Conditional: Container Orchestrator (ECS) --}}
{{#if (eq this.resource_type.name "ContainerOrchestrator")}}
{{#if (eq this.cloud_provider.name "AWS")}}
resource "aws_ecs_cluster" "{{this.name}}" {
  name = "{{this.name}}"
  
  setting {
    name  = "containerInsights"
    value = "{{this.cloud_specific_properties.container_insights|default:"enabled"}}"
  }
  
  tags = {
    Name        = "{{this.name}}"
    ManagedBy   = "IDP"
    Blueprint   = "{{../blueprint.name}}"
    Environment = var.environment
  }
}

resource "aws_ecs_task_definition" "{{this.name}}" {
  family                   = "{{this.name}}-task"
  network_mode             = "{{this.cloud_specific_properties.network_mode|default:"awsvpc"}}"
  requires_compatibilities = ["{{this.cloud_specific_properties.launch_type|default:"FARGATE"}}"]
  cpu                      = "{{this.cloud_specific_properties.cpu|default:"256"}}"
  memory                   = "{{this.cloud_specific_properties.memory|default:"512"}}"
  
  container_definitions = jsonencode([
    {
      name      = "{{this.name}}-container"
      image     = "{{this.cloud_specific_properties.image|default:"nginx:latest"}}"
      essential = true
      
      portMappings = [
        {
          containerPort = {{this.cloud_specific_properties.container_port|default:"80"}}
          protocol      = "tcp"
        }
      ]
    }
  ])
  
  tags = {
    Name        = "{{this.name}}"
    ManagedBy   = "IDP"
    Blueprint   = "{{../blueprint.name}}"
    Environment = var.environment
  }
}
{{/if}}
{{/if}}

{{!-- Conditional: Storage (S3) --}}
{{#if (eq this.resource_type.name "Storage")}}
{{#if (eq this.cloud_provider.name "AWS")}}
resource "aws_s3_bucket" "{{this.name}}" {
  bucket = "{{this.name}}-${var.environment}"
  
  tags = {
    Name        = "{{this.name}}"
    ManagedBy   = "IDP"
    Blueprint   = "{{../blueprint.name}}"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "{{this.name}}" {
  bucket = aws_s3_bucket.{{this.name}}.id
  
  versioning_configuration {
    status = "{{this.cloud_specific_properties.versioning|default:"Enabled"}}"
  }
}

{{#if this.cloud_specific_properties.encryption_enabled}}
resource "aws_s3_bucket_server_side_encryption_configuration" "{{this.name}}" {
  bucket = aws_s3_bucket.{{this.name}}.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "{{this.cloud_specific_properties.encryption_algorithm|default:"AES256"}}"
    }
  }
}
{{/if}}
{{/if}}
{{/if}}

{{/each}}

{{!-- Common tags for all resources --}}
locals {
  common_tags = {
    ManagedBy   = "IDP"
    Blueprint   = "{{blueprint.name}}"
    Environment = var.environment
    CreatedBy   = "terraform"
  }
}
