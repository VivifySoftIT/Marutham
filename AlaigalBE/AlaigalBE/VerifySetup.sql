-- Alaigal Setup Verification Script
-- Run this to check if everything is set up correctly

USE Alaigal;
GO

PRINT '========================================';
PRINT 'Alaigal Database Setup Verification';
PRINT '========================================';
PRINT '';

-- Check if database exists
PRINT '1. Database Check:';
PRINT '   Database: ' + DB_NAME();
PRINT '   Server: ' + @@SERVERNAME;
PRINT '';

-- Check if all tables exist
PRINT '2. Tables Check:';
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL 
    PRINT '   ✓ Users table exists'
ELSE 
    PRINT '   ✗ Users table MISSING - Run DatabaseScript.sql';

IF OBJECT_ID('dbo.Members', 'U') IS NOT NULL 
    PRINT '   ✓ Members table exists'
ELSE 
    PRINT '   ✗ Members table MISSING - Run DatabaseScript.sql';

IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL 
    PRINT '   ✓ Payments table exists'
ELSE 
    PRINT '   ✗ Payments table MISSING - Run DatabaseScript.sql';

IF OBJECT_ID('dbo.Attendance', 'U') IS NOT NULL 
    PRINT '   ✓ Attendance table exists'
ELSE 
    PRINT '   ✗ Attendance table MISSING - Run DatabaseScript.sql';

IF OBJECT_ID('dbo.Batches', 'U') IS NOT NULL 
    PRINT '   ✓ Batches table exists'
ELSE 
    PRINT '   ✗ Batches table MISSING - Run DatabaseScript.sql';

IF OBJECT_ID('dbo.Inventory', 'U') IS NOT NULL 
    PRINT '   ✓ Inventory table exists'
ELSE 
    PRINT '   ✗ Inventory table MISSING - Run DatabaseScript.sql';

IF OBJECT_ID('dbo.Notices', 'U') IS NOT NULL 
    PRINT '   ✓ Notices table exists'
ELSE 
    PRINT '   ✗ Notices table MISSING - Run DatabaseScript.sql';

PRINT '';

-- Check Users table data
PRINT '3. Users Table Check:';
IF EXISTS (SELECT 1 FROM Users)
BEGIN
    DECLARE @UserCount INT;
    SELECT @UserCount = COUNT(*) FROM Users;
    PRINT '   Total Users: ' + CAST(@UserCount AS VARCHAR);
    
    -- Check for admin user
    IF EXISTS (SELECT 1 FROM Users WHERE Username = 'admin')
    BEGIN
        PRINT '   ✓ Admin user exists';
        
        -- Show admin user details
        SELECT 
            '   Username: ' + Username AS Info,
            '   Email: ' + Email AS Info2,
            '   Role: ' + Role AS Info3,
            '   Active: ' + CAST(IsActive AS VARCHAR) AS Info4
        FROM Users 
        WHERE Username = 'admin';
        
        -- Verify password hash
        DECLARE @StoredHash NVARCHAR(MAX);
        SELECT @StoredHash = PasswordHash FROM Users WHERE Username = 'admin';
        
        IF @StoredHash = 'pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4='
            PRINT '   ✓ Password hash is correct for "vivify"';
        ELSE IF @StoredHash = 'jGl25bVBBBW96Qi9Te4V37Fnqchz/Eu4qB9vKrRIqRg='
            PRINT '   ✓ Password hash is correct for "Admin@123"';
        ELSE
            PRINT '   ⚠ Password hash does not match known test passwords';
    END
    ELSE
    BEGIN
        PRINT '   ✗ Admin user MISSING - Run InsertTestUser.sql';
    END
END
ELSE
BEGIN
    PRINT '   ✗ No users found - Run InsertTestUser.sql';
END

PRINT '';

-- Check Members table data
PRINT '4. Members Table Check:';
IF EXISTS (SELECT 1 FROM Members)
BEGIN
    DECLARE @MemberCount INT;
    SELECT @MemberCount = COUNT(*) FROM Members;
    PRINT '   Total Members: ' + CAST(@MemberCount AS VARCHAR);
END
ELSE
BEGIN
    PRINT '   No members yet (this is OK for new setup)';
END

PRINT '';

-- Check Payments table data
PRINT '5. Payments Table Check:';
IF EXISTS (SELECT 1 FROM Payments)
BEGIN
    DECLARE @PaymentCount INT;
    SELECT @PaymentCount = COUNT(*) FROM Payments;
    PRINT '   Total Payments: ' + CAST(@PaymentCount AS VARCHAR);
END
ELSE
BEGIN
    PRINT '   No payments yet (this is OK for new setup)';
END

PRINT '';
PRINT '========================================';
PRINT 'Verification Complete';
PRINT '========================================';
PRINT '';

-- Summary
PRINT 'SUMMARY:';
PRINT '--------';

IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL 
   AND EXISTS (SELECT 1 FROM Users WHERE Username = 'admin')
BEGIN
    PRINT '✓ Setup looks good! You can try logging in.';
    PRINT '';
    PRINT 'Login Credentials:';
    PRINT '  Username: admin';
    PRINT '  Password: vivify (or Admin@123 depending on hash)';
END
ELSE
BEGIN
    PRINT '✗ Setup incomplete. Please:';
    PRINT '  1. Run DatabaseScript.sql to create tables';
    PRINT '  2. Run InsertTestUser.sql to create admin user';
END

PRINT '';
GO
