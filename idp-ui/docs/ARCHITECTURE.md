# Overview
This is the user interface for an Internal Developer Platform. It is built using React and TypeScript. It provides the user with a stack-centric experience. The core of the system is the stack. A stack is a single service or UI that includes dependent infrastructure.

# Target Audience
The target audience for this system is developers and operations engineers.

# API
The architecture document for the API can be found at https://github.com/angryss/idp-api/blob/main/docs/ARCHITECTURE.md, which maps to ../../idp-api/docs/ARCHITECTURE.md in the local filesystem.

# Authentication
The user must log in using their AWS credentials using SSO to access this system. If they log in successfully, idp-api will generate an access_token and refresh_token that the React application can use to interact with the API.

# stack-centric
The application is stack-centric. When the user logs in, they are presented with a list of stacks that are associated with a "stack collection", which is a new concept. A stack collection is a named list of stacks.

Stacks are cloud-agnostic by design and do not have a direct association with a cloud provider. The cloud provider is determined at the environment level when provisioning, allowing the same stack to be deployed across multiple cloud providers (AWS, Azure, GCP, on-premises) through different environments. This design enables true portability and multi-cloud deployment strategies.

Next to each stack will exist an action icon. If the user clicks the action icon, it will bring up a list of possible actions to perform on the stack. The "Provision" action should be at the top. If the user selects it, a dialog will appear prompting them which environment to provision the stack in. Once the click "Provision" in that dialog, it will run a GitHub Actions workflow that will handle the stack provisioning, which will create all the compute and infrastructure resources.

The second action in for each stack will be the "Select Infrastructure" option. That will bring up a list of infrastructure items that the application needs. Available options are defined in the idp-api architecture documentation.

# Dynamic Infrastructure Forms

The application uses a schema-driven approach for rendering cloud-specific property forms. Instead of hardcoding forms for each cloud provider and resource type combination, the system fetches property schemas from the backend and dynamically generates appropriate UI controls.

This feature is implemented through three main components:

1. **DynamicResourceForm**: Main component that orchestrates schema fetching, property rendering, and validation
2. **PropertyInput**: Specialized component that renders appropriate input controls based on property data type
3. **PropertySchemaService**: Service class that manages fetching and caching of property schemas

For detailed documentation, see [Dynamic Infrastructure Forms](./DYNAMIC_INFRASTRUCTURE_FORMS.md).
