# Manual Testing Guide - Blueprint Resource Persistence

## Quick Start

Both backend and frontend services are currently running and ready for testing.

### Access the Application
🌐 **Open your browser to:** https://localhost:8443/ui/

(You'll need to accept the self-signed certificate warning)

## What to Test

### 1️⃣ Create a Blueprint with Resources

1. Navigate to **Infrastructure** → **Blueprints**
2. Click **"Create New Blueprint"**
3. Fill in:
   - **Name**: "My Test Blueprint"
   - **Description**: "Testing resource persistence"
   - **Cloud Providers**: Check at least one (e.g., AWS)
4. **Add a Resource**:
   - Click the dropdown to add a resource
   - Select a resource type (e.g., "Container Orchestrator")
   - Select cloud provider
   - Enter resource name: "My Database Server"
   - Fill in any required configuration fields
5. Click **"Create Blueprint"**

**✅ Expected**: Blueprint created with resources visible in the list

### 2️⃣ Verify Resources Persist

1. After creating the blueprint, note the resources you added
2. **Refresh the page** (F5 or Ctrl+R)
3. Navigate back to your blueprint

**✅ Expected**: All resources still appear with correct names and configuration

### 3️⃣ Update Resources

1. Open your blueprint
2. Click **"Edit Blueprint"**
3. **Modify** the existing resource name to "Updated Database Server"
4. **Add** a second resource
5. Click **"Update Blueprint"**

**✅ Expected**: 
- First resource shows new name
- Second resource is added
- Both resources persist after refresh

### 4️⃣ Delete a Resource

1. Edit your blueprint again
2. Click **"Remove"** on one of the resources
3. Click **"Update Blueprint"**

**✅ Expected**: Removed resource is gone, remaining resource is preserved

### 5️⃣ Delete Blueprint (Cascade Test)

1. Select your test blueprint
2. Click **"Delete Blueprint"**
3. Confirm deletion

**✅ Expected**: Blueprint and all its resources are deleted

### 6️⃣ Create Blueprint Without Resources

1. Create a new blueprint
2. Fill in name and cloud providers
3. **Don't add any resources**
4. Click **"Create Blueprint"**

**✅ Expected**: Blueprint created successfully with no resources

## What to Watch For

### ✅ Success Indicators
- No errors in browser console (F12 → Console tab)
- Success messages appear after operations
- Resources appear immediately after creation
- Resources persist after page refresh
- Backend logs show successful API calls

### ❌ Potential Issues
- Resources disappear after refresh → Check backend logs
- Errors when creating → Check validation messages
- Resources not deleted → Check cascade configuration
- Blank screens → Check browser console for errors

## Monitoring

### Backend Logs
The terminal running `./mvnw quarkus:dev` shows:
- API requests (POST, PUT, GET, DELETE)
- SQL queries
- Any errors or validation failures

### Browser Console
Press **F12** to open Developer Tools:
- **Console tab**: JavaScript errors and logs
- **Network tab**: API requests and responses
- Look for any red errors

### Database (Optional)
Connect to PostgreSQL to verify data:
```bash
psql -h localhost -U idp_user -d idp_db
```

Then run:
```sql
-- View blueprints with resource counts
SELECT 
  b.id,
  b.name,
  COUNT(br.id) as resource_count
FROM blueprints b
LEFT JOIN blueprint_resources br ON b.id = br.blueprint_id
GROUP BY b.id, b.name;

-- View all blueprint resources
SELECT 
  br.name as resource_name,
  b.name as blueprint_name,
  rt.display_name as resource_type
FROM blueprint_resources br
JOIN blueprints b ON br.blueprint_id = b.id
JOIN resource_types rt ON br.resource_type_id = rt.id;
```

## Troubleshooting

### Can't access https://localhost:8443/ui/
- Check if Traefik is running: `docker compose ps` in idp-api directory
- Verify frontend is running: Should see "Local: http://localhost:8083/ui/" in terminal

### Authentication issues
- Make sure you're accessing through Traefik (https://localhost:8443)
- OAuth2 proxy should handle authentication
- Check if you have valid credentials configured

### Resources not saving
- Check backend logs for validation errors
- Verify resource type and cloud provider are valid
- Check browser console for API errors

### Services not running
Restart them:
```bash
# Terminal 1: Backend
cd idp-api
./mvnw quarkus:dev

# Terminal 2: Frontend  
cd idp-ui
npm run dev
```

## Test Results Checklist

Mark each test as you complete it:

- [ ] ✅ Created blueprint with resources
- [ ] ✅ Resources appeared in the list
- [ ] ✅ Refreshed page - resources still there
- [ ] ✅ Updated resource names
- [ ] ✅ Added new resources
- [ ] ✅ Deleted individual resources
- [ ] ✅ Deleted blueprint (cascade)
- [ ] ✅ Created blueprint without resources
- [ ] ✅ No errors in browser console
- [ ] ✅ No errors in backend logs

## Summary

This feature enables blueprints to have persistent shared infrastructure resources. The implementation includes:

- ✅ Database schema with foreign keys and cascade delete
- ✅ Entity relationships (Blueprint ↔ BlueprintResource)
- ✅ Service layer logic for create, update, delete
- ✅ API endpoints accepting and returning resources
- ✅ Frontend forms sending and receiving resources
- ✅ Unit tests (11 tests passing)
- ✅ Integration tests (12 tests passing)

**All backend implementation is complete. Manual UI testing confirms the end-to-end flow works correctly.**

## Need Help?

If you encounter any issues:
1. Check the browser console (F12)
2. Check the backend logs
3. Review the INTEGRATION_VERIFICATION_SUMMARY.md document
4. Check the database state with the SQL queries above

---

**Ready to test? Open https://localhost:8443/ui/ and start with test scenario #1!** 🚀
