# API Key Authentication Mechanism Investigation

## Issue Summary

API Key authentication tests are failing because the `ApiKeyAuthenticationMechanism` is not being activated during test execution.

## Test Failures

All tests in `ApiKeyAuthenticationMechanismTest` are failing with unexpected status codes:
- Tests expecting 401 (unauthorized) are getting 200 (success)
- Tests expecting 200 (success) with valid API keys are getting 401 (unauthorized)
- This indicates authentication is not working as expected

## Current Configuration

### Authentication Mechanisms

Both authentication mechanisms are configured with `@Alternative` and `@Priority`:

1. **ApiKeyAuthenticationMechanism** - Priority 0 (highest)
   - Checks for `Authorization: Bearer <api-key>` header
   - Returns `null` if no Bearer token present (falls through to next mechanism)
   - Returns SecurityIdentity if valid API key
   - Returns failure if invalid API key

2. **TraefikAuthenticationMechanism** - Priority 1 (lower)
   - Checks for `X-Auth-Request-*` headers from OAuth2 Proxy
   - Returns `null` if no headers present
   - Returns SecurityIdentity if headers present

### beans.xml Configuration

Both `src/main/resources/META-INF/beans.xml` and `src/test/resources/META-INF/beans.xml` have:

```xml
<alternatives>
    <class>com.angryss.idp.infrastructure.security.ApiKeyAuthenticationMechanism</class>
    <class>com.angryss.idp.infrastructure.security.TraefikAuthenticationMechanism</class>
</alternatives>
```

### application.properties Configuration

Test profile has:
```properties
quarkus.http.auth.basic=false
quarkus.http.auth.proactive=false
idp.security.admin-group=Admins
```

## Root Cause Analysis

The issue is that `@Alternative` with `@Priority` in Quarkus security mechanisms doesn't work as expected. In Quarkus, `HttpAuthenticationMechanism` implementations should NOT use `@Alternative` when you want multiple mechanisms to form a chain.

### How Quarkus Authentication Works

1. Quarkus tries each `HttpAuthenticationMechanism` in priority order
2. If a mechanism returns `null`, the next one is tried
3. If a mechanism returns a SecurityIdentity, authentication succeeds
4. If a mechanism returns a failure, authentication fails immediately

### The Problem with @Alternative

When using `@Alternative`:
- CDI treats these as alternative implementations of the same bean
- Only ONE alternative can be active at a time
- The `@Priority` determines which one is selected
- This prevents the chaining behavior we need

## Solution

Remove `@Alternative` annotation from both authentication mechanisms. Keep `@Priority` to control the order.

### Why This Works

1. Without `@Alternative`, both mechanisms are active beans
2. `@Priority` still controls the order (0 before 1)
3. ApiKeyAuthenticationMechanism runs first:
   - If Bearer token present: validates and returns SecurityIdentity or failure
   - If no Bearer token: returns null, falls through to Traefik mechanism
4. TraefikAuthenticationMechanism runs second:
   - If OAuth2 headers present: returns SecurityIdentity
   - If no headers: returns null (no authentication)

## Implementation Plan

1. Remove `@Alternative` from `ApiKeyAuthenticationMechanism.java`
2. Remove `@Alternative` from `TraefikAuthenticationMechanism.java`
3. Remove `<alternatives>` section from both `beans.xml` files
4. Keep `@Priority` annotations (0 and 1)
5. Run tests to verify authentication works correctly

## Expected Behavior After Fix

- API key authentication tests should pass
- OAuth2 authentication should still work
- Authentication chain should work: API key → OAuth2 → Unauthorized


## Fix Applied

### Changes Made

1. **ApiKeyAuthenticationMechanism.java**
   - Removed `@Alternative` annotation
   - Removed unused import `jakarta.enterprise.inject.Alternative`
   - Kept `@Priority(0)` to ensure it runs first

2. **TraefikAuthenticationMechanism.java**
   - Removed `@Alternative` annotation
   - Removed unused import `jakarta.enterprise.inject.Alternative`
   - Kept `@Priority(1)` to ensure it runs second

3. **src/main/resources/META-INF/beans.xml**
   - Removed `<alternatives>` section
   - Added comment explaining authentication mechanisms are enabled via @Priority

4. **src/test/resources/META-INF/beans.xml**
   - Removed `<alternatives>` section
   - Added comment explaining authentication mechanisms are enabled via @Priority

### Why This Fix Works

In Quarkus, `HttpAuthenticationMechanism` implementations form a chain when multiple are present:

1. **Without @Alternative**: Both mechanisms are active as regular CDI beans
2. **With @Priority**: Quarkus invokes them in priority order (0 before 1)
3. **Chain behavior**: 
   - If a mechanism returns `null`, the next one is tried
   - If a mechanism returns a SecurityIdentity, authentication succeeds
   - If a mechanism returns a failure, authentication fails immediately

### Authentication Flow After Fix

```
Request arrives
    ↓
ApiKeyAuthenticationMechanism (Priority 0)
    ├─ Has "Authorization: Bearer <key>" header?
    │   ├─ Yes → Validate API key
    │   │   ├─ Valid → Return SecurityIdentity ✓
    │   │   └─ Invalid → Return failure (401) ✗
    │   └─ No → Return null (fall through)
    ↓
TraefikAuthenticationMechanism (Priority 1)
    ├─ Has "X-Auth-Request-*" headers?
    │   ├─ Yes → Return SecurityIdentity ✓
    │   └─ No → Return null (no authentication)
    ↓
No authentication → 401 Unauthorized ✗
```

### Testing Next Steps

Run the authentication tests to verify the fix:
```bash
./mvnw test -Dtest=ApiKeyAuthenticationMechanismTest
./mvnw test -Dtest=ApiKeySecurityTest
./mvnw test -Dtest=ApiKeyE2ETest
```

Expected results:
- All API key authentication tests should pass
- OAuth2 authentication should still work
- Authentication chain should work correctly


## Additional Issues Found

### Issue 1: Blocking Operations on IO Thread

**Problem**: The `validateApiKey` method was marked with `@Transactional` and called directly from the authentication mechanism, which runs on the IO thread. This caused:
```
BlockingOperationNotAllowedException: Cannot start a JTA transaction from the IO thread.
```

**Solution**: Split the validation into two methods:
1. `validateApiKey()` - Returns a `Uni` that runs on a worker thread using `runSubscriptionOn()`
2. `performValidation()` - Contains the actual `@Transactional` logic

### Issue 2: Health Endpoint Not Requiring Authentication

**Problem**: The `/v1/health` endpoint didn't have `@Authenticated` annotation, so authentication mechanisms weren't being invoked at all.

**Solution**: Added `@Authenticated` annotation to `HealthController`.

### Issue 3: Transaction Isolation in Tests

**Current Status**: Tests are now invoking the authentication mechanism, but failing with "Invalid API key" error. This suggests a transaction isolation issue where:
1. Test creates API key in a transaction
2. Test tries to use API key immediately
3. Authentication mechanism can't find the key because the transaction hasn't committed yet

**Next Steps**: Need to investigate transaction handling in tests to ensure API keys are visible to the authentication mechanism.
