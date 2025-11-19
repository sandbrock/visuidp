# Analytics Pipeline - Data Pipeline on Azure
# Generated for demo purposes - DO NOT DEPLOY

terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.stack_name}-rg"
  location = var.azure_region
}

# Data Lake Storage Account
resource "azurerm_storage_account" "datalake" {
  name                     = replace("${var.stack_name}dl", "-", "")
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"
  is_hns_enabled           = true  # Hierarchical namespace for Data Lake

  blob_properties {
    versioning_enabled = true
  }
}

# Data Lake Container for raw data
resource "azurerm_storage_data_lake_gen2_filesystem" "raw" {
  name               = "raw"
  storage_account_id = azurerm_storage_account.datalake.id
}

# Data Lake Container for processed data
resource "azurerm_storage_data_lake_gen2_filesystem" "processed" {
  name               = "processed"
  storage_account_id = azurerm_storage_account.datalake.id
}

# SQL Database for analytics
resource "azurerm_mssql_server" "main" {
  name                         = "${var.stack_name}-sql"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
}

resource "azurerm_mssql_database" "analytics" {
  name      = "analytics"
  server_id = azurerm_mssql_server.main.id
  sku_name  = "S2"
  max_size_gb = 250

  tags = {
    Name        = "${var.stack_name}-analytics-db"
    Environment = var.environment
  }
}

# Data Factory
resource "azurerm_data_factory" "main" {
  name                = "${var.stack_name}-adf"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  identity {
    type = "SystemAssigned"
  }
}

# Data Factory Linked Service for Data Lake
resource "azurerm_data_factory_linked_service_data_lake_storage_gen2" "datalake" {
  name            = "DataLakeLinkedService"
  data_factory_id = azurerm_data_factory.main.id
  url             = azurerm_storage_account.datalake.primary_dfs_endpoint

  use_managed_identity = true
}

# Data Factory Linked Service for SQL Database
resource "azurerm_data_factory_linked_service_azure_sql_database" "sql" {
  name            = "SqlLinkedService"
  data_factory_id = azurerm_data_factory.main.id
  connection_string = "Server=tcp:${azurerm_mssql_server.main.fully_qualified_domain_name},1433;Initial Catalog=${azurerm_mssql_database.analytics.name};Persist Security Info=False;User ID=${var.sql_admin_username};Password=${var.sql_admin_password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
}

# Grant Data Factory access to Data Lake
resource "azurerm_role_assignment" "adf_datalake" {
  scope                = azurerm_storage_account.datalake.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_data_factory.main.identity[0].principal_id
}

# Log Analytics Workspace for monitoring
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.stack_name}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}
