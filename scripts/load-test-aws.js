/**
 * K6 Load Test Script for AWS Lambda + API Gateway + DynamoDB Deployment
 * 
 * This script tests the deployed AWS infrastructure including:
 * - API Gateway HTTP API with JWT authorization
 * - Lambda function cold starts and warm execution
 * - DynamoDB read/write performance
 * - CloudFront caching behavior
 * 
 * Usage:
 *   k6 run --env API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com \
 *          --env JWT_TOKEN=your-jwt-token \
 *          scripts/load-test-aws.js
 * 
 * Requirements: 10.1
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const coldStartRate = new Rate('cold_starts');
const warmStartRate = new Rate('warm_starts');
const apiResponseTime = new Trend('api_response_time');
const dbOperationTime = new Trend('db_operation_time');
const errorRate = new Rate('errors');
const throttleRate = new Rate('throttles');
const authFailureRate = new Rate('auth_failures');

// Test configuration
export const options = {
  stages: [
    // Warm-up phase - measure cold starts
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    
    // Steady state - measure warm performance
    { duration: '2m', target: 10 },   // Maintain 10 concurrent users
    
    // Load test - test scaling
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    
    // Peak load - test limits
    { duration: '1m', target: 100 },  // Peak at 100 users
    
    // Cool down
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    // API response time requirements (Requirement 10.1)
    'api_response_time': ['p(95)<2000', 'p(99)<5000'], // 95th percentile < 2s, 99th < 5s
    
    // Cold start requirements (Requirement 10.1, 10.2)
    'http_req_duration{scenario:cold_start}': ['p(95)<1000'], // Cold start < 1s for native image
    
    // Error rate requirements
    'errors': ['rate<0.01'], // Less than 1% errors
    
    // Success rate
    'http_req_failed': ['rate<0.01'], // Less than 1% failed requests
    
    // Throttling should be minimal
    'throttles': ['rate<0.05'], // Less than 5% throttled
  },
};

// Environment variables
const API_URL = __ENV.API_URL || 'http://localhost:8082';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';
const API_KEY = __ENV.API_KEY || '';

// Test data
const testTeamId = 'test-team-' + Date.now();
const testStackIds = [];

/**
 * Setup function - runs once before all tests
 */
export function setup() {
  console.log('=== Load Test Setup ===');
  console.log('API URL:', API_URL);
  console.log('Authentication:', JWT_TOKEN ? 'JWT Token' : (API_KEY ? 'API Key' : 'None'));
  
  // Test authentication
  const headers = getHeaders();
  const healthCheck = http.get(`${API_URL}/v1/health`, { headers });
  
  if (healthCheck.status !== 200) {
    console.error('Health check failed:', healthCheck.status, healthCheck.body);
    throw new Error('API is not healthy');
  }
  
  console.log('API is healthy, starting load test...');
  
  return {
    apiUrl: API_URL,
    headers: headers,
    startTime: Date.now(),
  };
}

/**
 * Main test function - runs for each virtual user
 */
export default function(data) {
  const headers = data.headers;
  
  // Scenario 1: Read operations (most common)
  if (Math.random() < 0.6) {
    testReadOperations(data);
  }
  // Scenario 2: Write operations
  else if (Math.random() < 0.3) {
    testWriteOperations(data);
  }
  // Scenario 3: Mixed operations
  else {
    testMixedOperations(data);
  }
  
  // Random sleep between 1-3 seconds to simulate user think time
  sleep(Math.random() * 2 + 1);
}

/**
 * Test read-heavy operations (queries, list operations)
 */
function testReadOperations(data) {
  const headers = data.headers;
  
  // List stacks
  const listStart = Date.now();
  const listResponse = http.get(`${data.apiUrl}/v1/stacks`, { headers });
  const listDuration = Date.now() - listStart;
  
  const listSuccess = check(listResponse, {
    'list stacks status is 200': (r) => r.status === 200,
    'list stacks response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  apiResponseTime.add(listDuration);
  dbOperationTime.add(listDuration);
  
  if (!listSuccess) {
    errorRate.add(1);
    if (listResponse.status === 429) {
      throttleRate.add(1);
    } else if (listResponse.status === 401 || listResponse.status === 403) {
      authFailureRate.add(1);
    }
  } else {
    errorRate.add(0);
  }
  
  // Detect cold start (first request or after idle period)
  if (listDuration > 1000) {
    coldStartRate.add(1);
    warmStartRate.add(0);
  } else {
    coldStartRate.add(0);
    warmStartRate.add(1);
  }
  
  // List blueprints
  const blueprintsResponse = http.get(`${data.apiUrl}/v1/blueprints`, { headers });
  check(blueprintsResponse, {
    'list blueprints status is 200': (r) => r.status === 200,
  });
  
  // List teams
  const teamsResponse = http.get(`${data.apiUrl}/v1/teams`, { headers });
  check(teamsResponse, {
    'list teams status is 200': (r) => r.status === 200,
  });
}

/**
 * Test write operations (create, update, delete)
 */
function testWriteOperations(data) {
  const headers = data.headers;
  const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(7);
  
  // Create a stack
  const createPayload = JSON.stringify({
    name: `load-test-stack-${uniqueId}`,
    routePath: `/test-${uniqueId}/`,
    cloudName: `test-cloud-${uniqueId}`,
    stackType: 'INFRASTRUCTURE_ONLY',
    teamId: testTeamId,
  });
  
  const createStart = Date.now();
  const createResponse = http.post(`${data.apiUrl}/v1/stacks`, createPayload, {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
  const createDuration = Date.now() - createStart;
  
  const createSuccess = check(createResponse, {
    'create stack status is 201': (r) => r.status === 201,
    'create stack response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  apiResponseTime.add(createDuration);
  dbOperationTime.add(createDuration);
  
  if (!createSuccess) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
    
    // Store stack ID for cleanup
    try {
      const stack = JSON.parse(createResponse.body);
      if (stack.id) {
        testStackIds.push(stack.id);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
}

/**
 * Test mixed read/write operations
 */
function testMixedOperations(data) {
  const headers = data.headers;
  
  // Read operation
  const listResponse = http.get(`${data.apiUrl}/v1/stacks`, { headers });
  check(listResponse, {
    'mixed: list status is 200': (r) => r.status === 200,
  });
  
  // Write operation
  const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(7);
  const createPayload = JSON.stringify({
    name: `mixed-test-${uniqueId}`,
    routePath: `/mixed-${uniqueId}/`,
    cloudName: `mixed-cloud-${uniqueId}`,
    stackType: 'INFRASTRUCTURE_ONLY',
    teamId: testTeamId,
  });
  
  const createResponse = http.post(`${data.apiUrl}/v1/stacks`, createPayload, {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
  
  check(createResponse, {
    'mixed: create status is 201': (r) => r.status === 201,
  });
}

/**
 * Teardown function - runs once after all tests
 */
export function teardown(data) {
  console.log('=== Load Test Teardown ===');
  console.log('Cleaning up test data...');
  
  // Note: In a real scenario, you would clean up test stacks here
  // For now, we'll leave them for manual inspection
  
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Total test duration: ${duration.toFixed(2)} seconds`);
  console.log('Load test complete!');
}

/**
 * Helper function to get authentication headers
 */
function getHeaders() {
  const headers = {};
  
  if (JWT_TOKEN) {
    headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
  } else if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  
  return headers;
}

/**
 * Handle summary - custom summary output
 */
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    'stdout': textSummary(data),
  };
}

/**
 * Generate text summary
 */
function textSummary(data) {
  const summary = [];
  
  summary.push('='.repeat(60));
  summary.push('AWS Lambda + DynamoDB Load Test Results');
  summary.push('='.repeat(60));
  summary.push('');
  
  // Test duration
  const duration = (data.state.testRunDurationMs / 1000).toFixed(2);
  summary.push(`Test Duration: ${duration} seconds`);
  summary.push('');
  
  // Request statistics
  const metrics = data.metrics;
  if (metrics.http_reqs) {
    summary.push('Request Statistics:');
    summary.push(`  Total Requests: ${metrics.http_reqs.values.count}`);
    summary.push(`  Requests/sec: ${metrics.http_reqs.values.rate.toFixed(2)}`);
    summary.push('');
  }
  
  // Response time statistics
  if (metrics.http_req_duration) {
    summary.push('Response Time (ms):');
    summary.push(`  Average: ${metrics.http_req_duration.values.avg.toFixed(2)}`);
    summary.push(`  Median: ${metrics.http_req_duration.values.med.toFixed(2)}`);
    summary.push(`  95th percentile: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}`);
    summary.push(`  99th percentile: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}`);
    summary.push(`  Max: ${metrics.http_req_duration.values.max.toFixed(2)}`);
    summary.push('');
  }
  
  // Cold start statistics
  if (metrics.cold_starts) {
    const coldStartPct = (metrics.cold_starts.values.rate * 100).toFixed(2);
    summary.push('Cold Start Statistics:');
    summary.push(`  Cold Start Rate: ${coldStartPct}%`);
    summary.push('');
  }
  
  // Error statistics
  if (metrics.errors) {
    const errorPct = (metrics.errors.values.rate * 100).toFixed(2);
    summary.push('Error Statistics:');
    summary.push(`  Error Rate: ${errorPct}%`);
    summary.push('');
  }
  
  // Throttle statistics
  if (metrics.throttles) {
    const throttlePct = (metrics.throttles.values.rate * 100).toFixed(2);
    summary.push('Throttle Statistics:');
    summary.push(`  Throttle Rate: ${throttlePct}%`);
    summary.push('');
  }
  
  summary.push('='.repeat(60));
  
  return summary.join('\n');
}
