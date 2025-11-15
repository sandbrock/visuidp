use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Deserialize, Serialize)]
pub struct Blueprint {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub resources: Vec<BlueprintResource>,
    pub supported_cloud_providers: Vec<CloudProvider>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BlueprintResource {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub resource_type: ResourceType,
    pub cloud_provider: CloudProvider,
    pub configuration: serde_json::Value,
    pub cloud_specific_properties: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Stack {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub cloud_name: String,
    pub stack_type: String,
    pub stack_resources: Vec<StackResource>,
    pub blueprint: Option<Blueprint>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct StackResource {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub resource_type: ResourceType,
    pub cloud_provider: CloudProvider,
    pub configuration: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ResourceType {
    pub id: Uuid,
    pub name: String,
    pub category: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CloudProvider {
    pub id: Uuid,
    pub name: String,
    pub display_name: String,
}
