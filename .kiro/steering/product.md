# Product Overview

This is an Internal Developer Platform (IDP) that automates provisioning and management of developer projects across multiple environments.

## Core Concept

The system is stack-centric. A "stack" represents a single service or UI application with its dependent infrastructure resources. Stacks can be provisioned to different environments (dev, staging, production) and across different cloud providers or on-premises infrastructure.

## Target Users

- Developers creating and managing application stacks
- Operations engineers managing infrastructure and environments

## Key Features

- Multi-environment support (dev, staging, production)
- Multi-cloud and on-premises deployment (AWS, Azure, GCP, baremetal Kubernetes)
- Automatic compute and infrastructure provisioning
- Stack types: Infrastructure-only, RESTful APIs (serverless/containerized), Web Applications, Event-driven services
- Blueprint system for reusable infrastructure patterns
- Idempotent provisioning process
- Ephemeral environments for testing

## Authentication

Uses OAuth2 Proxy with AWS Identity Center (SSO) for authentication. The API receives user information via HTTP headers from the proxy.
