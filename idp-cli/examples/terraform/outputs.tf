# Terraform Outputs
# Generated from IDP Blueprint/Stack

# Blueprint/Stack metadata outputs
output "blueprint_name" {
  description = "Name of the IDP blueprint"
  value       = "{{blueprint.name}}"
}

{{#if blueprint.description}}
output "blueprint_description" {
  description = "Description of the IDP blueprint"
  value       = "{{blueprint.description}}"
}
{{/if}}

{{#if stack}}
output "stack_name" {
  description = "Name of the IDP stack"
  value       = "{{stack.name}}"
}

output "stack_cloud_name" {
  description = "Cloud name for the stack"
  value       = "{{stack.cloud_name}}"
}
{{/if}}

# Resource-specific outputs
{{#each resources}}

{{!-- Database outputs --}}
{{#if (eq this.resource_type.name "RelationalDatabaseServer")}}
{{#if (eq this.cloud_provider.name "AWS")}}
output "{{this.name}}_endpoint" {
  description = "Database endpoint for {{this.name}}"
  value       = aws_db_instance.{{this.name}}.endpoint
}

output "{{this.name}}_arn" {
  description = "ARN of the database {{this.name}}"
  value       = aws_db_instance.{{this.name}}.arn
}

output "{{this.name}}_database_name" {
  description = "Database name for {{this.name}}"
  value       = aws_db_instance.{{this.name}}.db_name
}
{{/if}}

{{#if (eq this.cloud_provider.name "Azure")}}
output "{{this.name}}_fqdn" {
  description = "Fully qualified domain name for {{this.name}}"
  value       = azurerm_mssql_server.{{this.name}}.fully_qualified_domain_name
}

output "{{this.name}}_database_id" {
  description = "Database ID for {{this.name}}"
  value       = azurerm_mssql_database.{{this.name}}.id
}
{{/if}}
{{/if}}

{{!-- Container orchestrator outputs --}}
{{#if (eq this.resource_type.name "ContainerOrchestrator")}}
{{#if (eq this.cloud_provider.name "AWS")}}
output "{{this.name}}_cluster_id" {
  description = "ECS cluster ID for {{this.name}}"
  value       = aws_ecs_cluster.{{this.name}}.id
}

output "{{this.name}}_cluster_arn" {
  description = "ECS cluster ARN for {{this.name}}"
  value       = aws_ecs_cluster.{{this.name}}.arn
}

output "{{this.name}}_task_definition_arn" {
  description = "ECS task definition ARN for {{this.name}}"
  value       = aws_ecs_task_definition.{{this.name}}.arn
}
{{/if}}
{{/if}}

{{!-- Storage outputs --}}
{{#if (eq this.resource_type.name "Storage")}}
{{#if (eq this.cloud_provider.name "AWS")}}
output "{{this.name}}_bucket_name" {
  description = "S3 bucket name for {{this.name}}"
  value       = aws_s3_bucket.{{this.name}}.id
}

output "{{this.name}}_bucket_arn" {
  description = "S3 bucket ARN for {{this.name}}"
  value       = aws_s3_bucket.{{this.name}}.arn
}

output "{{this.name}}_bucket_domain_name" {
  description = "S3 bucket domain name for {{this.name}}"
  value       = aws_s3_bucket.{{this.name}}.bucket_domain_name
}
{{/if}}
{{/if}}

{{/each}}

# Summary output
output "resource_summary" {
  description = "Summary of all created resources"
  value = {
    blueprint = "{{blueprint.name}}"
    environment = var.environment
    resource_count = {{resources.length}}
    resources = [
      {{#each resources}}
      {
        name = "{{this.name}}"
        type = "{{this.resource_type.name}}"
        cloud_provider = "{{this.cloud_provider.name}}"
      }{{#unless @last}},{{/unless}}
      {{/each}}
    ]
  }
}
