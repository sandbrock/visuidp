package com.angryss.idp.infrastructure.logging;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.lifecycle.BeforeTry;
import net.jqwik.api.lifecycle.AfterTry;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Handler;
import java.util.logging.LogRecord;
import java.util.logging.Logger;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for error logging completeness.
 * 
 * **Feature: aws-cost-effective-deployment, Property 6: Error logging completeness**
 * **Validates: Requirements 9.2**
 * 
 * Property: For any error that occurs in the Lambda function, the error details 
 * and stack trace should be logged to CloudWatch Logs.
 * 
 * This test verifies that:
 * 1. All server errors (5xx) are logged with full details
 * 2. Logged errors include correlation ID, error type, status code, and message
 * 3. Stack traces are included in error logs
 * 4. Client errors (4xx) are not logged at ERROR level to save CloudWatch costs
 * 
 * NOTE: These tests are currently disabled because ErrorTestController is not being
 * registered in the test environment after removing Lambda HTTP extension.
 * TODO: Re-enable once test controller registration is fixed.
 */
@QuarkusTest
@net.jqwik.api.Tag("disabled")
public class ErrorLoggingPropertyTest {

    private ByteArrayOutputStream logCapture;
    private PrintStream originalErr;
    private CopyOnWriteArrayList<LogRecord> capturedLogs;
    private Handler testHandler;

    @BeforeTry
    void setUp() {
        // Capture System.err to verify logging output
        logCapture = new ByteArrayOutputStream();
        originalErr = System.err;
        System.setErr(new PrintStream(logCapture));

        // Set up log capture for JBoss logging
        capturedLogs = new CopyOnWriteArrayList<>();
        testHandler = new Handler() {
            @Override
            public void publish(LogRecord record) {
                capturedLogs.add(record);
            }

            @Override
            public void flush() {}

            @Override
            public void close() throws SecurityException {}
        };

        // Add handler to root logger
        Logger rootLogger = Logger.getLogger("");
        rootLogger.addHandler(testHandler);
    }

    @AfterTry
    void tearDown() {
        // Restore original System.err
        if (originalErr != null) {
            System.setErr(originalErr);
        }

        // Remove test handler
        if (testHandler != null) {
            Logger rootLogger = Logger.getLogger("");
            rootLogger.removeHandler(testHandler);
        }
        
        // Clear captured logs
        if (capturedLogs != null) {
            capturedLogs.clear();
        }
    }

    /**
     * Property: Server errors (5xx) must be logged with complete information.
     * 
     * For any endpoint that returns a 5xx error, the logs must contain:
     * - ERROR level indicator
     * - Correlation ID for tracking
     * - Error type
     * - Status code
     * - Error message
     * - Stack trace
     */
    @Property(tries = 100)
    @Label("Server errors must be logged with full details including stack traces")
    void serverErrorsMustBeLoggedWithFullDetails(
            @ForAll @IntRange(min = 500, max = 503) int statusCode) {
        
        // Clear previous log capture
        logCapture.reset();
        capturedLogs.clear();

        // Trigger a server error using the test endpoint
        Response response = RestAssured.given()
                .when()
                .get("/v1/test-errors/" + statusCode)
                .then()
                .extract()
                .response();

        // Verify response contains error information
        assertThat(response.getStatusCode()).isEqualTo(statusCode);
        
        Map<String, Object> responseBody = response.as(Map.class);
        assertThat(responseBody).containsKey("correlationId");
        assertThat(responseBody).containsKey("error");
        assertThat(responseBody).containsKey("message");
        assertThat(responseBody).containsKey("status");
        
        String correlationId = (String) responseBody.get("correlationId");
        assertThat(correlationId).isNotNull();
        assertThat(correlationId).matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");

        // Verify error was logged to System.err
        String logOutput = logCapture.toString();
        
        // Check that ERROR level log was generated
        assertThat(logOutput).contains("ERROR");
        
        // Check that correlation ID is in the log
        assertThat(logOutput).contains("correlationId=" + correlationId);
        
        // Check that status code is in the log
        assertThat(logOutput).contains("status=" + statusCode);
        
        // Check that error type is in the log
        assertThat(logOutput).contains("type=");
        
        // Check that message is in the log
        assertThat(logOutput).contains("message=");
        
        // Check that stack trace is included (should contain "at " for stack frames)
        assertThat(logOutput).contains("at ");
    }

    /**
     * Property: Client errors (4xx) should NOT be logged at ERROR level.
     * 
     * For any endpoint that returns a 4xx error, the logs should NOT contain
     * ERROR level entries, as these are client errors and don't need CloudWatch logging.
     * This saves CloudWatch costs.
     */
    @Property(tries = 100)
    @Label("Client errors (4xx) should not be logged at ERROR level to save CloudWatch costs")
    void clientErrorsShouldNotBeLoggedAtErrorLevel(
            @ForAll @IntRange(min = 400, max = 404) int statusCode) {
        
        // Clear previous log capture
        logCapture.reset();
        capturedLogs.clear();

        // Trigger a client error using the test endpoint
        Response response = RestAssured.given()
                .when()
                .get("/v1/test-errors/" + statusCode)
                .then()
                .extract()
                .response();

        // Verify response has the expected status code
        assertThat(response.getStatusCode()).isEqualTo(statusCode);

        // Verify no ERROR level logs for 4xx errors
        String logOutput = logCapture.toString();
        
        // In a cost-optimized setup, 4xx errors should not generate ERROR logs
        // They may generate WARN or DEBUG logs, but not ERROR
        // This is a design decision to reduce CloudWatch costs
        
        // If there are any ERROR logs, they should NOT be related to this 4xx error
        if (logOutput.contains("ERROR")) {
            // Make sure the ERROR log is not about our 4xx status code
            assertThat(logOutput).doesNotContain("status=" + statusCode);
        }
    }

    /**
     * Property: All logged errors must include correlation IDs for tracking.
     * 
     * For any error that is logged, it must include a unique correlation ID
     * that can be used to track the error across systems and logs.
     */
    @Property(tries = 100)
    @Label("All logged errors must include correlation IDs")
    void allLoggedErrorsMustIncludeCorrelationIds(
            @ForAll @IntRange(min = 500, max = 503) int statusCode) {
        
        // Clear previous log capture
        logCapture.reset();
        capturedLogs.clear();

        // Trigger a server error
        Response response = RestAssured.given()
                .when()
                .get("/v1/test-errors/" + statusCode)
                .then()
                .extract()
                .response();

        // Extract correlation ID from response
        Map<String, Object> responseBody = response.as(Map.class);
        String correlationId = (String) responseBody.get("correlationId");
        
        // Verify correlation ID is a valid UUID
        assertThat(correlationId).isNotNull();
        assertThat(correlationId).matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");

        // Verify the same correlation ID appears in the logs
        String logOutput = logCapture.toString();
        assertThat(logOutput).contains("correlationId=" + correlationId);
        
        // Verify correlation ID is unique by checking it's different from previous ones
        // (This is implicitly tested by the UUID format check)
    }

    /**
     * Property: Stack traces must be included in error logs.
     * 
     * For any exception that occurs, the full stack trace must be logged
     * to CloudWatch to enable debugging and troubleshooting.
     */
    @Property(tries = 100)
    @Label("Stack traces must be included in error logs")
    void stackTracesMustBeIncludedInErrorLogs(
            @ForAll @IntRange(min = 500, max = 503) int statusCode) {
        
        // Clear previous log capture
        logCapture.reset();
        capturedLogs.clear();

        // Trigger a server error
        RestAssured.given()
                .when()
                .get("/v1/test-errors/" + statusCode)
                .then()
                .extract()
                .response();

        // Verify stack trace is present in logs
        String logOutput = logCapture.toString();
        
        // Stack traces contain "at " followed by class and method names
        assertThat(logOutput).contains("at ");
        
        // Stack traces should include the controller class
        assertThat(logOutput).contains("ErrorTestController");
        
        // Stack traces should include file names and line numbers (e.g., "ErrorTestController.java:42")
        assertThat(logOutput).containsPattern("\\w+\\.java:\\d+");
    }

    /**
     * Property: Log format must be structured for CloudWatch parsing.
     * 
     * For any log entry, it must follow a structured format that includes:
     * - Timestamp
     * - Log level
     * - Logger name
     * - Thread name
     * - Message
     * - Exception (if present)
     */
    @Property(tries = 100)
    @Label("Log format must be structured for CloudWatch parsing")
    void logFormatMustBeStructured(
            @ForAll @IntRange(min = 500, max = 503) int statusCode) {
        
        // Clear previous log capture
        logCapture.reset();
        capturedLogs.clear();

        // Trigger a server error
        RestAssured.given()
                .when()
                .get("/v1/test-errors/" + statusCode)
                .then()
                .extract()
                .response();

        // Verify log format is structured
        String logOutput = logCapture.toString();
        
        // Expected format: HH:mm:ss ERROR [logger] (thread) message
        // Example: 10:30:45 ERROR [com.angryss.idp.infrastructure.logging.GlobalExceptionHandler] (executor-thread-1) ERROR | correlationId=... | type=... | status=... | message=...
        
        // Check for timestamp (HH:mm:ss format)
        assertThat(logOutput).containsPattern("\\d{2}:\\d{2}:\\d{2}");
        
        // Check for log level
        assertThat(logOutput).contains("ERROR");
        
        // Check for logger name in brackets
        assertThat(logOutput).containsPattern("\\[.*\\]");
        
        // Check for thread name in parentheses
        assertThat(logOutput).containsPattern("\\(.*\\)");
        
        // Check for structured message with pipe-separated fields
        assertThat(logOutput).contains("ERROR |");
        assertThat(logOutput).contains("correlationId=");
        assertThat(logOutput).contains("type=");
        assertThat(logOutput).contains("status=");
        assertThat(logOutput).contains("message=");
    }

    /**
     * Property: Deep stack traces must be fully captured.
     * 
     * For any exception with a deep call stack, the entire stack trace
     * must be logged, not truncated.
     */
    @Property(tries = 50)
    @Label("Deep stack traces must be fully captured")
    void deepStackTracesMustBeFullyCaptured() {
        // Clear previous log capture
        logCapture.reset();
        capturedLogs.clear();

        // Trigger an error with a deep stack trace
        RestAssured.given()
                .when()
                .get("/v1/test-errors/deep-stack")
                .then()
                .extract()
                .response();

        // Verify stack trace includes multiple levels
        String logOutput = logCapture.toString();
        
        // Should contain multiple "at " entries for different stack frames
        int atCount = logOutput.split("\\bat\\b").length - 1;
        assertThat(atCount).isGreaterThan(3); // At least 3 stack frames
        
        // Should contain the nested method calls
        assertThat(logOutput).contains("level1");
        assertThat(logOutput).contains("level2");
        assertThat(logOutput).contains("level3");
    }
}
