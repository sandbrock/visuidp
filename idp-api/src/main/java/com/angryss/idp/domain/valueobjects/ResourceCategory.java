package com.angryss.idp.domain.valueobjects;

/**
 * Defines the category of a resource type, determining where it can be used.
 * SHARED resources are only for blueprints (e.g., ECS Cluster).
 * NON_SHARED resources are only for stacks (e.g., RDS Database).
 * BOTH resources can be used in either context.
 */
public enum ResourceCategory {
    SHARED,      // Only for blueprints (e.g., ECS Cluster)
    NON_SHARED,  // Only for stacks (e.g., RDS Database)
    BOTH         // Can be used in either context
}
