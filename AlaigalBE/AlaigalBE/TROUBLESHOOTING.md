# Troubleshooting Guide - 500 Error on Login

## Current Issue
- API is being called correctly: `POST /api/Auth/login`
- Getting HTTP 500 (Internal Server Error)
- This means the backend code is running but encountering an error

## Possible Causes

### 1. Users Table Doesn't Exist
**Solution:** Run the DatabaseScript.sql to create all tables

```sql
-- Run this in SQL Server Management Studio
USE Alaigal;
GO

-- Check if Users table exists
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users';

-- If it doesn't exist, run the full DatabaseScript.sql
```

### 2. No User Records in Database
**Solution:** Run InsertTestUser.sql to create a test user

```sql
-- This creates user with:
-- Username: admin
-- Password: vivify
```

### 3. Password Hash Mismatch
The AuthController uses SHA256 hashing. The password "vivify" should hash to:
`pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=`

**Verify in database:**
```sql
SELECT Username, PasswordHash FROM Users WHERE Username = 'admin';
```

### 4. Database Connection Issue
**Check appsettings.json:**
```json
{
  "ConnectionStrings": {
    "AlaigalDb": "server=103.230.85.44;initial catalog=Alaigal;User Id=sa;Password=V9/f+?b$H%9d;TrustServerCertificate=True"
  }
}
```

**Test connection:**
```sql
-- Try connecting to the database with these credentials
-- Server: 103.230.85.44
-- Database: Alaigal
-- User: sa
```

## Step-by-Step Fix

### Step 1: Check Backend Logs
Look at the IIS logs or application logs to see the exact error message.

### Step 2: Verify Database
```sql
USE Alaigal;
GO

-- Check if Users table exists
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users';

-- Check if there are any users
SELECT COUNT(*) FROM Users;

-- Check the admin user
SELECT * FROM Users WHERE Username = 'admin';
```

### Step 3: Create/Update Test User
Run this SQL to ensure the user exists with correct password:

```sql
USE Alaigal;
GO

-- Delete existing admin user
DELETE FROM Users WHERE Username = 'admin';
GO

-- Insert admin user with password "vivify"
INSERT INTO Users (Username, Email, PasswordHash, FullName, Role, IsActive, CreatedDate)
VALUES (
    'admin', 
    'admin@alaigal.com', 
    'pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=',
    'Administrator', 
    'Admin', 
    1, 
    GETUTCDATE()
);
GO

-- Verify
SELECT Id, Username, Email, PasswordHash, FullName, Role, IsActive 
FROM Users 
WHERE Username = 'admin';
GO
```

### Step 4: Test Login Again
Try logging in with:
- Username: `admin`
- Password: `vivify`

### Step 5: Check Backend Error Details

If still getting 500 error, check the backend logs for details. Common issues:

1. **DbContext not registered**
   - Check Program.cs has: `builder.Services.AddDbContext<AlaigalRefContext>`

2. **Connection string wrong**
   - Verify database server is accessible
   - Check credentials are correct

3. **Missing Entity Framework packages**
   - Ensure these NuGet packages are installed:
     - Microsoft.EntityFrameworkCore
     - Microsoft.EntityFrameworkCore.SqlServer

## Quick Test Queries

### Test 1: Check Database Connection
```sql
SELECT @@VERSION;
SELECT DB_NAME();
```

### Test 2: Check Users Table Structure
```sql
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Users'
ORDER BY ORDINAL_POSITION;
```

### Test 3: Verify Password Hash
```sql
-- The hash for "vivify" should be:
-- pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=

SELECT 
    Username,
    PasswordHash,
    CASE 
        WHEN PasswordHash = 'pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=' 
        THEN 'CORRECT' 
        ELSE 'WRONG' 
    END AS HashStatus
FROM Users 
WHERE Username = 'admin';
```

## Alternative: Use Different Password

If you want to use a different password, generate the hash:

### For password "Admin@123":
```sql
UPDATE Users 
SET PasswordHash = 'jGl25bVBBBW96Qi9Te4V37Fnqchz/Eu4qB9vKrRIqRg='
WHERE Username = 'admin';
```

### For password "admin123":
```sql
UPDATE Users 
SET PasswordHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE Username = 'admin';
```

## Contact Backend Team

If the issue persists, ask the backend team to:

1. Check the application logs for the exact error message
2. Verify the database connection is working
3. Confirm the Users table exists and has data
4. Test the login endpoint directly on the server
5. Share the exact error message from the logs

## Expected Success Response

When login works correctly, you should get:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@alaigal.com",
    "fullName": "Administrator",
    "role": "Admin"
  }
}
```

## Files to Deploy

Make sure these files are deployed to the server:

1. **AlaigalBE/Controllers/AuthController.cs** - Login logic
2. **AlaigalBE/Models/User.cs** - User model
3. **AlaigalBE/Models/AlaigalContext.cs** - Database context
4. **AlaigalBE/Program.cs** - App configuration
5. **AlaigalBE/appsettings.json** - Connection string

All these files are already created in the AlaigalBE folder.
