use serde::Deserialize;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct Blueprint {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub resources: Vec<BlueprintResource>,
    pub supported_cloud_providers: Vec<CloudProvider>,
}

#[derive(Debug, Deserialize)]
pub struct BlueprintResource {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub resource_type: ResourceType,
    pub cloud_provider: CloudProvider,
    pub configuration: serde_json::Value,
    pub cloud_specific_properties: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct Stack {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub cloud_name: String,
    pub stack_type: String,
    pub stack_resources: Vec<StackResource>,
    pub blueprint: Option<Blueprint>,
}

#[derive(Debug, Deserialize)]
pub struct StackResource {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub resource_type: ResourceType,
    pub cloud_provider: CloudProvider,
    pub configuration: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ResourceType {
    pub id: Uuid,
    pub name: String,
    pub category: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct CloudProvider {
    pub id: Uuid,
    pub name: String,
    pub display_name: String,
}
