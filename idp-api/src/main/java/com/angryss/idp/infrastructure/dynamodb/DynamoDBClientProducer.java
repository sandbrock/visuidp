package com.angryss.idp.infrastructure.dynamodb;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import java.net.URI;
import java.util.Optional;
import java.util.logging.Logger;

/**
 * Produces DynamoDB client instances for dependency injection.
 * Configures the client based on application properties.
 */
@ApplicationScoped
public class DynamoDBClientProducer {
    
    private static final Logger LOGGER = Logger.getLogger(DynamoDBClientProducer.class.getName());
    
    @ConfigProperty(name = "idp.database.dynamodb.region", defaultValue = "us-east-1")
    String region;
    
    @ConfigProperty(name = "idp.database.dynamodb.endpoint")
    Optional<String> endpoint;
    
    @Produces
    @ApplicationScoped
    public DynamoDbClient produceDynamoDbClient() {
        LOGGER.info("Creating DynamoDB client for region: " + region);
        
        var builder = DynamoDbClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create());
        
        // Use custom endpoint if provided (for local testing with DynamoDB Local)
        endpoint.ifPresent(ep -> {
            LOGGER.info("Using custom DynamoDB endpoint: " + ep);
            builder.endpointOverride(URI.create(ep));
        });
        
        return builder.build();
    }
}
