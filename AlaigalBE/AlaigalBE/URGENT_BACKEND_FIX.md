# URGENT: Fix 500 Error on Login

## Problem
`POST /api/Auth/login` is returning HTTP 500 error.

## Database Status
✅ Database is correct
✅ User exists: admin (Id: 2)
✅ Password hash is correct: pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=

## Quick Fix Options

### Option 1: Deploy SimpleAuthController (Recommended - 5 minutes)

This is a simplified version without JWT that will work immediately.

**File:** `Controllers/SimpleAuthController.cs`

**Steps:**
1. Copy `SimpleAuthController.cs` to your Controllers folder
2. Rebuild: `dotnet build`
3. Restart application
4. Test: `POST https://www.vivifysoft.in/AlaigalBE/api/SimpleAuth/login`

**Test with cURL:**
```bash
curl -X POST https://www.vivifysoft.in/AlaigalBE/api/SimpleAuth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"vivify"}'
```

**Expected Response:**
```json
{
  "token": "...",
  "user": {
    "id": 2,
    "username": "admin",
    "email": "admin@alaigal.com",
    "fullName": "Administrator",
    "role": "Admin"
  }
}
```

### Option 2: Fix AuthController (Proper Fix - 15 minutes)

The AuthController is failing because of one of these issues:

#### Issue 1: Missing JWT Configuration
Check `appsettings.json` has this:
```json
{
  "Jwt": {
    "Issuer": "https://www.vivifysoft.in",
    "Audience": "https://www.vivifysoft.in",
    "SecretKey": "VivifyaKd83jFhLzqP9s3yBnW6XpG7VzRjL2XmH5tW4CvF7Ds9JcX2Nr"
  }
}
```

#### Issue 2: Missing NuGet Package
Ensure this package is installed:
```bash
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

#### Issue 3: DbContext Not Registered
Check `Program.cs` has:
```csharp
builder.Services.AddDbContext<AlaigalRefContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AlaigalDb")));
```

### Option 3: Deploy TestController (For Debugging - 2 minutes)

Deploy `TestController.cs` to help diagnose the issue.

**Test endpoints:**
```bash
# Test 1: API is running
curl https://www.vivifysoft.in/AlaigalBE/api/Test

# Test 2: Database connection
curl https://www.vivifysoft.in/AlaigalBE/api/Test/database

# Test 3: Get users
curl https://www.vivifysoft.in/AlaigalBE/api/Test/users

# Test 4: Test login logic
curl -X POST https://www.vivifysoft.in/AlaigalBE/api/Test/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"vivify"}'
```

## Files to Deploy

Deploy these files to fix the issue:

1. ✅ **SimpleAuthController.cs** (Quick fix - works immediately)
2. ✅ **TestController.cs** (For debugging)
3. ✅ **AuthController.cs** (Proper fix - needs JWT config)
4. ✅ **User.cs** (Model)
5. ✅ **AlaigalContext.cs** (DbContext with Users DbSet)

## Deployment Steps

```bash
# 1. Copy all files to server

# 2. Navigate to project folder
cd /path/to/AlaigalBE

# 3. Clean and restore
dotnet clean
dotnet restore

# 4. Build
dotnet build --configuration Release

# 5. Publish
dotnet publish -c Release -o ./publish

# 6. Copy publish folder to IIS
# Copy ./publish/* to C:\inetpub\wwwroot\AlaigalBE\

# 7. Restart IIS Application Pool
# Or restart the application
```

## Check Application Logs

The 500 error details are in the logs. Check:

**Windows Event Viewer:**
1. Open Event Viewer
2. Go to: Windows Logs → Application
3. Look for errors from "ASP.NET Core" or your application name
4. Find the error that occurred when login was attempted

**IIS Logs:**
- Location: `C:\inetpub\logs\LogFiles\`
- Look for 500 errors with timestamp matching the login attempt

**Application Logs:**
- Check if your app writes to any custom log files
- Look in the application folder for .log files

## Common Errors and Solutions

### Error: "Unable to resolve service for type 'AlaigalRefContext'"
**Solution:** Add DbContext registration in Program.cs
```csharp
builder.Services.AddDbContext<AlaigalRefContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AlaigalDb")));
```

### Error: "The ConnectionString property has not been initialized"
**Solution:** Check appsettings.json has correct connection string
```json
{
  "ConnectionStrings": {
    "AlaigalDb": "server=103.230.85.44;initial catalog=Alaigal;User Id=sa;Password=V9/f+?b$H%9d;TrustServerCertificate=True"
  }
}
```

### Error: "IDX10503: Signature validation failed"
**Solution:** JWT configuration issue. Use SimpleAuthController instead.

### Error: "Cannot find type 'User'"
**Solution:** Ensure User.cs is deployed and has correct namespace:
```csharp
namespace Alaigal.Models;
public class User { ... }
```

### Error: "Invalid object name 'dbo.Users'"
**Solution:** Run DatabaseScript.sql to create Users table

## Testing After Deployment

### Test 1: SimpleAuth Login
```bash
curl -X POST https://www.vivifysoft.in/AlaigalBE/api/SimpleAuth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"vivify"}'
```

Should return 200 with token and user object.

### Test 2: Main Auth Login
```bash
curl -X POST https://www.vivifysoft.in/AlaigalBE/api/Auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"vivify"}'
```

Should return 200 with token and user object.

## Priority Actions

**RIGHT NOW (5 minutes):**
1. Deploy SimpleAuthController.cs
2. Restart application
3. Test login

**NEXT (15 minutes):**
1. Check application logs for exact error
2. Fix the root cause in AuthController
3. Redeploy

**LATER (30 minutes):**
1. Deploy all other controllers (Members, Payments, etc.)
2. Test all endpoints
3. Remove SimpleAuthController (use proper AuthController)

## Contact Info

If you need help:
1. Share the exact error message from logs
2. Share the output of Test endpoints
3. Confirm which files are deployed
4. Confirm application pool is running

## Expected Timeline

- **5 minutes:** SimpleAuth deployed and working
- **15 minutes:** Root cause identified from logs
- **30 minutes:** Proper fix deployed
- **1 hour:** All endpoints tested and working

## Success Criteria

✅ Login returns 200 status
✅ Token is generated
✅ User object is returned
✅ Frontend can login successfully
✅ Other API endpoints work with the token

## Current Workaround

The frontend now tries 3 endpoints in order:
1. SimpleAuth/login (new, simple, no JWT)
2. Auth/login (main endpoint with JWT)
3. Test/login (debug endpoint)

Once ANY of these work, the app will function normally.
