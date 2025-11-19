# Payment API - Serverless API on Azure Functions
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

# Storage Account for Function App
resource "azurerm_storage_account" "function" {
  name                     = replace("${var.stack_name}func", "-", "")
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "${var.stack_name}-plan"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "Y1"  # Consumption plan
}

# Function App
resource "azurerm_linux_function_app" "main" {
  name                = "${var.stack_name}-func"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  storage_account_name       = azurerm_storage_account.function.name
  storage_account_access_key = azurerm_storage_account.function.primary_access_key
  service_plan_id            = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = "18"
    }

    cors {
      allowed_origins = ["*"]
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"       = "node"
    "WEBSITE_NODE_DEFAULT_VERSION"   = "~18"
    "COSMOS_DB_CONNECTION_STRING"    = azurerm_cosmosdb_account.main.connection_strings[0]
    "SERVICEBUS_CONNECTION_STRING"   = azurerm_servicebus_namespace.main.default_primary_connection_string
  }
}

# Cosmos DB Account
resource "azurerm_cosmosdb_account" "main" {
  name                = "${var.stack_name}-cosmos"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.main.location
    failover_priority = 0
  }
}

# Cosmos DB Database
resource "azurerm_cosmosdb_sql_database" "main" {
  name                = "payments"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  throughput          = 400
}

# Cosmos DB Container
resource "azurerm_cosmosdb_sql_container" "transactions" {
  name                = "transactions"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.main.name
  partition_key_path  = "/userId"
  throughput          = 400
}

# Service Bus Namespace
resource "azurerm_servicebus_namespace" "main" {
  name                = "${var.stack_name}-sb"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard"
}

# Service Bus Queue
resource "azurerm_servicebus_queue" "payment_events" {
  name         = "payment-events"
  namespace_id = azurerm_servicebus_namespace.main.id

  max_delivery_count               = 10
  lock_duration                    = "PT5M"
  requires_duplicate_detection     = true
  duplicate_detection_history_time_window = "PT10M"
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "${var.stack_name}-insights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
}
