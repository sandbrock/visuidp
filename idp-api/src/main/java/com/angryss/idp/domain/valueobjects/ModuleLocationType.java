package com.angryss.idp.domain.valueobjects;

/**
 * Defines the type of location where a Terraform module is stored.
 */
public enum ModuleLocationType {
    GIT,          // Git repository URL
    FILE_SYSTEM,  // Local file path
    REGISTRY      // Terraform registry reference
}
