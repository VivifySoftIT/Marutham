# Quick Fix for 500 Error

## The Problem
You're getting HTTP 500 error when trying to login. This means:
- ✅ API URL is correct
- ✅ Frontend is working
- ❌ Backend has an error (likely database issue)

## The Solution (3 Steps)

### Step 1: Run Database Setup Script
Open SQL Server Management Studio and run:

```sql
-- File: DatabaseScript.sql
-- This creates all tables including Users table
```

### Step 2: Create Test User
Run this SQL script:

```sql
-- File: InsertTestUser.sql
-- This creates admin user with password "vivify"
```

### Step 3: Verify Setup
Run this to check everything:

```sql
-- File: VerifySetup.sql
-- This checks if tables and user exist
```

## Quick SQL Commands

If you want to do it manually, run these commands in SQL Server:

```sql
USE Alaigal;
GO

-- 1. Create Users table (if not exists)
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE Users (
        Id INT PRIMARY KEY IDENTITY(1,1),
        Username NVARCHAR(100) NOT NULL UNIQUE,
        Email NVARCHAR(100) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(MAX) NOT NULL,
        FullName NVARCHAR(100),
        Phone NVARCHAR(15),
        Role NVARCHAR(50) NOT NULL DEFAULT 'Admin',
        ProfileImage NVARCHAR(500),
        LastLogin DATETIME,
        ResetToken NVARCHAR(MAX),
        ResetTokenExpiry DATETIME,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedBy NVARCHAR(100),
        CreatedDate DATETIME NOT NULL DEFAULT GETUTCDATE(),
        UpdatedBy NVARCHAR(100),
        UpdatedDate DATETIME
    );
END
GO

-- 2. Delete old admin user (if exists)
DELETE FROM Users WHERE Username = 'admin';
GO

-- 3. Insert admin user
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

-- 4. Verify
SELECT * FROM Users WHERE Username = 'admin';
GO
```

## Test Login

After running the above SQL:

**Username:** `admin`  
**Password:** `vivify`

## If Still Not Working

1. **Check Backend Logs**
   - Look at IIS logs or application logs
   - Find the exact error message

2. **Verify Connection String**
   - Check `appsettings.json` in AlaigalBE folder
   - Make sure database server is accessible

3. **Check if Backend is Running**
   - Try accessing: `https://www.vivifysoft.in/AlaigalBE/api/Members`
   - Should return JSON or 401 (not 404 or 500)

## Files You Need

All files are in the `AlaigalBE` folder:

1. ✅ **DatabaseScript.sql** - Creates all tables
2. ✅ **InsertTestUser.sql** - Creates admin user
3. ✅ **VerifySetup.sql** - Checks if setup is correct
4. ✅ **TROUBLESHOOTING.md** - Detailed troubleshooting guide

## Password Hashes Reference

If you want to use different passwords:

| Password | Hash |
|----------|------|
| vivify | `pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=` |
| Admin@123 | `jGl25bVBBBW96Qi9Te4V37Fnqchz/Eu4qB9vKrRIqRg=` |

To change password:
```sql
UPDATE Users 
SET PasswordHash = 'pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4='
WHERE Username = 'admin';
```

## Expected Success

When login works, you'll see in console:
```
LOG  API Request: POST https://www.vivifysoft.in/AlaigalBE/api/Auth/login
LOG  Request Body: {"username":"admin","password":"vivify"}
LOG  API Response Status: 200
LOG  API Response Data: {token: "...", user: {...}}
```

Then the app will navigate to the dashboard!
