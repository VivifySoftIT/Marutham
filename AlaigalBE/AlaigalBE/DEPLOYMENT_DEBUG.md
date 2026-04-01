# Deployment & Debugging Guide for 500 Error

## Current Situation
- ✅ Database has correct user data
- ✅ Frontend is calling correct URL
- ✅ Password hash is correct
- ❌ Getting 500 error on login

## Most Likely Causes

### 1. Backend Not Recompiled/Redeployed
The new AuthController code might not be deployed to the server.

**Solution:**
```bash
# In AlaigalBE folder
dotnet clean
dotnet build
dotnet publish -c Release -o ./publish
```

Then copy the `publish` folder contents to the server.

### 2. Missing NuGet Packages
The server might be missing required packages.

**Check these packages in AlaigalBE.csproj:**
```xml
<PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.0" />
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.0" />
```

### 3. Connection String Issue
The database connection might be failing.

**Test with TestController:**
```
GET https://www.vivifysoft.in/AlaigalBE/api/Test/database
```

Should return:
```json
{
  "message": "Database connection successful",
  "userCount": 1
}
```

## Step-by-Step Debugging

### Step 1: Test if API is Running
```
GET https://www.vivifysoft.in/AlaigalBE/api/Test
```

**Expected Response:**
```json
{
  "message": "API is working!",
  "timestamp": "2026-01-05T06:30:00Z"
}
```

If this fails → Backend is not running or not deployed correctly

### Step 2: Test Database Connection
```
GET https://www.vivifysoft.in/AlaigalBE/api/Test/database
```

**Expected Response:**
```json
{
  "message": "Database connection successful",
  "userCount": 1
}
```

If this fails → Database connection issue (check connection string)

### Step 3: Test User Query
```
GET https://www.vivifysoft.in/AlaigalBE/api/Test/users
```

**Expected Response:**
```json
[
  {
    "id": 2,
    "username": "admin",
    "email": "admin@alaigal.com",
    "role": "Admin",
    "isActive": true
  }
]
```

If this fails → Users table issue or DbContext configuration problem

### Step 4: Test Login Logic
```
POST https://www.vivifysoft.in/AlaigalBE/api/Test/login
Content-Type: application/json

{
  "username": "admin",
  "password": "vivify"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "username": "admin",
  "storedHash": "pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
  "providedHash": "pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
  "hashesMatch": true
}
```

If this works but `/api/Auth/login` doesn't → Issue with AuthController or JWT configuration

## Testing from Frontend

Update your LoginScreen temporarily to test:

```javascript
// Test API endpoint
const testAPI = async () => {
  try {
    // Test 1: Basic API
    const test1 = await fetch('https://www.vivifysoft.in/AlaigalBE/api/Test');
    console.log('Test 1:', await test1.json());

    // Test 2: Database
    const test2 = await fetch('https://www.vivifysoft.in/AlaigalBE/api/Test/database');
    console.log('Test 2:', await test2.json());

    // Test 3: Users
    const test3 = await fetch('https://www.vivifysoft.in/AlaigalBE/api/Test/users');
    console.log('Test 3:', await test3.json());

    // Test 4: Login
    const test4 = await fetch('https://www.vivifysoft.in/AlaigalBE/api/Test/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'vivify' })
    });
    console.log('Test 4:', await test4.json());
  } catch (error) {
    console.error('Test Error:', error);
  }
};

// Call this in useEffect
useEffect(() => {
  testAPI();
}, []);
```

## Common Issues & Solutions

### Issue 1: "Cannot find type 'User'"
**Cause:** User model not compiled or namespace issue

**Solution:**
```csharp
// Make sure User.cs has correct namespace
namespace Alaigal.Models;

public class User { ... }
```

### Issue 2: "DbSet 'Users' not found"
**Cause:** DbContext not updated

**Solution:**
```csharp
// In AlaigalContext.cs
public DbSet<User> Users { get; set; }
```

### Issue 3: "Cannot connect to database"
**Cause:** Connection string wrong or database not accessible

**Solution:**
Check `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "AlaigalDb": "server=103.230.85.44;initial catalog=Alaigal;User Id=sa;Password=V9/f+?b$H%9d;TrustServerCertificate=True"
  }
}
```

Test connection from server using SQL Server Management Studio.

### Issue 4: "JWT configuration error"
**Cause:** Missing JWT settings in appsettings.json

**Solution:**
```json
{
  "Jwt": {
    "Issuer": "https://www.vivifysoft.in",
    "Audience": "https://www.vivifysoft.in",
    "SecretKey": "VivifyaKd83jFhLzqP9s3yBnW6XpG7VzRjL2XmH5tW4CvF7Ds9JcX2Nr"
  }
}
```

## Files to Deploy

Make sure ALL these files are on the server:

1. ✅ **Controllers/AuthController.cs**
2. ✅ **Controllers/TestController.cs** (new - for debugging)
3. ✅ **Models/User.cs**
4. ✅ **Models/AlaigalContext.cs**
5. ✅ **Program.cs**
6. ✅ **appsettings.json**
7. ✅ **AlaigalBE.csproj**

## Rebuild & Redeploy Steps

```bash
# 1. Clean previous build
dotnet clean

# 2. Restore packages
dotnet restore

# 3. Build
dotnet build --configuration Release

# 4. Publish
dotnet publish -c Release -o ./publish

# 5. Copy publish folder to server
# Copy everything from ./publish to server deployment folder

# 6. Restart IIS Application Pool
# Or restart the application
```

## Check Server Logs

Look for error logs in:
- IIS logs: `C:\inetpub\logs\LogFiles`
- Application logs: Event Viewer → Windows Logs → Application
- Custom logs: Check if application writes to any log files

The error message will tell you exactly what's wrong.

## Quick Fix: Use TestController

If AuthController keeps failing, you can temporarily use TestController for login:

```javascript
// In service/api.js
async login(username, password) {
  // Use test endpoint temporarily
  const response = await this.request('/api/Test/login', 'POST', { username, password }, false);
  
  if (response.success) {
    // Generate a simple token (not secure, just for testing)
    const token = btoa(username + ':' + new Date().getTime());
    await this.setToken(token);
    return { token, user: { username } };
  } else {
    throw new Error(response.message);
  }
}
```

This will help you test if the issue is with AuthController specifically or with the entire backend.

## Contact Backend Team

If none of this works, ask the backend team to:

1. Check the application logs for the exact error
2. Verify all files are deployed
3. Confirm the application pool is running
4. Test the endpoints directly on the server
5. Share the complete error message and stack trace
