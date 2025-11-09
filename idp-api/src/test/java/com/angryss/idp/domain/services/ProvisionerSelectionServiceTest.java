package com.angryss.idp.domain.services;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.valueobjects.Environment;
import com.angryss.idp.domain.valueobjects.ResourceType;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class ProvisionerSelectionServiceTest {

    @Inject
    ProvisionerSelectionService provisionerService;

    @BeforeEach
    @Transactional
    public void setupTestData() {
        // Ensure CloudProviders exist
        CloudProvider onPrem = CloudProvider.find("name", "On-premises").firstResult();
        if (onPrem == null) {
            onPrem = new CloudProvider();
            onPrem.name = "On-premises";
            onPrem.displayName = "On-premises";
            onPrem.enabled = true;
            onPrem.persist();
        }
        CloudProvider aws = CloudProvider.find("name", "AWS").firstResult();
        if (aws == null) {
            aws = new CloudProvider();
            aws.name = "AWS";
            aws.displayName = "Amazon Web Services";
            aws.enabled = true;
            aws.persist();
        }

        // Ensure EnvironmentEntity: Development (On-premises)
        EnvironmentEntity devEnvEntity = EnvironmentEntity.find("name", "Development").firstResult();
        if (devEnvEntity == null) {
            devEnvEntity = new EnvironmentEntity();
            devEnvEntity.setName("Development");
        }
        devEnvEntity.setCloudProvider(onPrem);
        devEnvEntity.setDescription("Development environment running on baremetal Kubernetes");
        devEnvEntity.persist();

        // Ensure EnvironmentConfig for Development
        EnvironmentConfig devConfig = EnvironmentConfig.findByEnvironment(devEnvEntity);
        if (devConfig == null) {
            devConfig = new EnvironmentConfig(devEnvEntity, "On-premises Development",
                    "Development environment running on baremetal Kubernetes");
        } else {
            devConfig.setEnvironment(devEnvEntity);
            devConfig.setName("On-premises Development");
            devConfig.setDescription("Development environment running on baremetal Kubernetes");
        }
        devConfig.persist();

        // Ensure EnvironmentEntity: Production (AWS)
        EnvironmentEntity prodEnvEntity = EnvironmentEntity.find("name", "Production").firstResult();
        if (prodEnvEntity == null) {
            prodEnvEntity = new EnvironmentEntity();
            prodEnvEntity.setName("Production");
        }
        prodEnvEntity.setCloudProvider(aws);
        prodEnvEntity.setDescription("Production environment in AWS cloud");
        prodEnvEntity.persist();

        // Ensure EnvironmentConfig for Production
        EnvironmentConfig prodConfig = EnvironmentConfig.findByEnvironment(prodEnvEntity);
        if (prodConfig == null) {
            prodConfig = new EnvironmentConfig(prodEnvEntity, "AWS Production",
                    "Production environment in AWS cloud");
        } else {
            prodConfig.setEnvironment(prodEnvEntity);
            prodConfig.setName("AWS Production");
            prodConfig.setDescription("Production environment in AWS cloud");
        }
        prodConfig.persist();
    }

    @Test
    public void testSelectOnPremisesComputeProvisioner() {
        String provisioner = provisionerService.selectComputeProvisioner(StackType.RESTFUL_API, Environment.DEV);
        assertEquals("kubernetes-provisioner", provisioner);
    }

    @Test
    public void testSelectAwsComputeProvisionerForApi() {
        String provisioner = provisionerService.selectComputeProvisioner(StackType.RESTFUL_API, Environment.PROD);
        assertEquals("ecs-fargate-provisioner", provisioner);
    }

    @Test
    public void testSelectAwsComputeProvisionerForServerless() {
        String provisioner = provisionerService.selectComputeProvisioner(StackType.RESTFUL_SERVERLESS, Environment.PROD);
        assertEquals("lambda-provisioner", provisioner);
    }

    @Test
    public void testSelectEventDrivenApiComputeProvisioner() {
        String provisioner = provisionerService.selectComputeProvisioner(StackType.EVENT_DRIVEN_API, Environment.PROD);
        assertEquals("ecs-fargate-provisioner", provisioner);
    }

    @Test
    public void testSelectOnPremisesInfrastructureProvisioner() {
        String provisioner = provisionerService.selectInfrastructureProvisioner(ResourceType.RELATIONAL_DATABASE, Environment.DEV);
        assertEquals("postgresql-provisioner", provisioner);
    }

    @Test
    public void testSelectAwsInfrastructureProvisioner() {
        String provisioner = provisionerService.selectInfrastructureProvisioner(ResourceType.RELATIONAL_DATABASE, Environment.PROD);
        assertEquals("aurora-postgresql-provisioner", provisioner);
    }

    @Test
    public void testGetComputeType() {
        String onPremType = provisionerService.getComputeType(StackType.RESTFUL_API, Environment.DEV);
        assertEquals("kubernetes", onPremType);

        String awsType = provisionerService.getComputeType(StackType.RESTFUL_API, Environment.PROD);
        assertEquals("fargate", awsType);

        String serverlessType = provisionerService.getComputeType(StackType.RESTFUL_SERVERLESS, Environment.PROD);
        assertEquals("lambda", serverlessType);
    }

    @Test
    public void testGetCloudType() {
        String devType = provisionerService.getCloudType(Environment.DEV);
        assertEquals("On-premises", devType);

        String prodType = provisionerService.getCloudType(Environment.PROD);
        assertEquals("AWS", prodType);
    }

    @Test
    @Transactional
    public void testUnknownEnvironmentThrowsException() {
        // Remove PROD environment to simulate missing configuration
        EnvironmentConfig prod = EnvironmentConfig.findByEnvironment(Environment.PROD);
        if (prod != null) {
            prod.delete();
        }
        assertThrows(IllegalArgumentException.class, () -> {
            provisionerService.selectComputeProvisioner(StackType.RESTFUL_API, Environment.PROD);
        });
    }
}
