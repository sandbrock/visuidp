use std::collections::HashMap;

pub struct ResourceMapper {
    mappings: HashMap<(String, String), TerraformResourceType>,
}

impl ResourceMapper {
    pub fn new() -> Self {
        let mut mappings = HashMap::new();

        // AWS Resource Mappings
        mappings.insert(
            ("RelationalDatabaseServer".to_string(), "AWS".to_string()),
            TerraformResourceType {
                provider: "aws".to_string(),
                resource_type: "aws_db_instance".to_string(),
                attribute_mappings: HashMap::from([
                    ("engine".to_string(), "engine".to_string()),
                    ("engine_version".to_string(), "engine_version".to_string()),
                    ("instance_class".to_string(), "instance_class".to_string()),
                    ("allocated_storage".to_string(), "allocated_storage".to_string()),
                    ("storage_type".to_string(), "storage_type".to_string()),
                    ("db_name".to_string(), "db_name".to_string()),
                    ("username".to_string(), "username".to_string()),
                    ("password".to_string(), "password".to_string()),
                    ("port".to_string(), "port".to_string()),
                    ("publicly_accessible".to_string(), "publicly_accessible".to_string()),
                    ("multi_az".to_string(), "multi_az".to_string()),
                    ("backup_retention_period".to_string(), "backup_retention_period".to_string()),
                ]),
            },
        );

        mappings.insert(
            ("ContainerOrchestrator".to_string(), "AWS".to_string()),
            TerraformResourceType {
                provider: "aws".to_string(),
                resource_type: "aws_ecs_cluster".to_string(),
                attribute_mappings: HashMap::from([
                    ("cluster_name".to_string(), "name".to_string()),
                    ("capacity_providers".to_string(), "capacity_providers".to_string()),
                    ("default_capacity_provider_strategy".to_string(), "default_capacity_provider_strategy".to_string()),
                ]),
            },
        );

        mappings.insert(
            ("Storage".to_string(), "AWS".to_string()),
            TerraformResourceType {
                provider: "aws".to_string(),
                resource_type: "aws_s3_bucket".to_string(),
                attribute_mappings: HashMap::from([
                    ("bucket_name".to_string(), "bucket".to_string()),
                    ("acl".to_string(), "acl".to_string()),
                    ("versioning".to_string(), "versioning".to_string()),
                    ("encryption".to_string(), "server_side_encryption_configuration".to_string()),
                ]),
            },
        );

        // Azure Resource Mappings
        mappings.insert(
            ("RelationalDatabaseServer".to_string(), "Azure".to_string()),
            TerraformResourceType {
                provider: "azurerm".to_string(),
                resource_type: "azurerm_mssql_server".to_string(),
                attribute_mappings: HashMap::from([
                    ("server_name".to_string(), "name".to_string()),
                    ("resource_group_name".to_string(), "resource_group_name".to_string()),
                    ("location".to_string(), "location".to_string()),
                    ("version".to_string(), "version".to_string()),
                    ("administrator_login".to_string(), "administrator_login".to_string()),
                    ("administrator_login_password".to_string(), "administrator_login_password".to_string()),
                    ("minimum_tls_version".to_string(), "minimum_tls_version".to_string()),
                    ("public_network_access_enabled".to_string(), "public_network_access_enabled".to_string()),
                ]),
            },
        );

        mappings.insert(
            ("ContainerOrchestrator".to_string(), "Azure".to_string()),
            TerraformResourceType {
                provider: "azurerm".to_string(),
                resource_type: "azurerm_kubernetes_cluster".to_string(),
                attribute_mappings: HashMap::from([
                    ("cluster_name".to_string(), "name".to_string()),
                    ("resource_group_name".to_string(), "resource_group_name".to_string()),
                    ("location".to_string(), "location".to_string()),
                    ("dns_prefix".to_string(), "dns_prefix".to_string()),
                    ("kubernetes_version".to_string(), "kubernetes_version".to_string()),
                    ("node_count".to_string(), "default_node_pool.node_count".to_string()),
                    ("vm_size".to_string(), "default_node_pool.vm_size".to_string()),
                ]),
            },
        );

        // GCP Resource Mappings
        mappings.insert(
            ("RelationalDatabaseServer".to_string(), "GCP".to_string()),
            TerraformResourceType {
                provider: "google".to_string(),
                resource_type: "google_sql_database_instance".to_string(),
                attribute_mappings: HashMap::from([
                    ("instance_name".to_string(), "name".to_string()),
                    ("database_version".to_string(), "database_version".to_string()),
                    ("region".to_string(), "region".to_string()),
                    ("tier".to_string(), "settings.tier".to_string()),
                    ("disk_size".to_string(), "settings.disk_size".to_string()),
                    ("disk_type".to_string(), "settings.disk_type".to_string()),
                    ("availability_type".to_string(), "settings.availability_type".to_string()),
                    ("backup_enabled".to_string(), "settings.backup_configuration.enabled".to_string()),
                ]),
            },
        );

        mappings.insert(
            ("ContainerOrchestrator".to_string(), "GCP".to_string()),
            TerraformResourceType {
                provider: "google".to_string(),
                resource_type: "google_container_cluster".to_string(),
                attribute_mappings: HashMap::from([
                    ("cluster_name".to_string(), "name".to_string()),
                    ("location".to_string(), "location".to_string()),
                    ("initial_node_count".to_string(), "initial_node_count".to_string()),
                    ("node_version".to_string(), "node_version".to_string()),
                    ("min_master_version".to_string(), "min_master_version".to_string()),
                    ("machine_type".to_string(), "node_config.machine_type".to_string()),
                    ("disk_size_gb".to_string(), "node_config.disk_size_gb".to_string()),
                ]),
            },
        );

        Self { mappings }
    }

    pub fn get_terraform_resource_type(
        &self,
        resource_type: &str,
        cloud_provider: &str,
    ) -> Option<&TerraformResourceType> {
        self.mappings
            .get(&(resource_type.to_string(), cloud_provider.to_string()))
    }
}

pub struct TerraformResourceType {
    pub provider: String,
    pub resource_type: String,
    pub attribute_mappings: HashMap<String, String>,
}
