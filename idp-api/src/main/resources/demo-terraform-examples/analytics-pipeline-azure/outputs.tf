output "data_lake_name" {
  description = "Name of the Data Lake Storage account"
  value       = azurerm_storage_account.datalake.name
}

output "data_lake_endpoint" {
  description = "Primary DFS endpoint of the Data Lake"
  value       = azurerm_storage_account.datalake.primary_dfs_endpoint
}

output "sql_server_fqdn" {
  description = "Fully qualified domain name of the SQL Server"
  value       = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "sql_database_name" {
  description = "Name of the SQL Database"
  value       = azurerm_mssql_database.analytics.name
}

output "data_factory_name" {
  description = "Name of the Data Factory"
  value       = azurerm_data_factory.main.name
}

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics Workspace"
  value       = azurerm_log_analytics_workspace.main.id
}
