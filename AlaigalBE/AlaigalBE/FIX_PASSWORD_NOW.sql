-- URGENT FIX: Update admin password to correct hash
-- Run this in SQL Server Management Studio

USE Alaigal;
GO

-- Update the password from plain text "vivify" to the correct hash
-- The hash "8C6AnWu/IVrL8EM5A/IfD4ryJTLZ1igrkmqxhCwHRzg=" is what the backend generates for "vivify"
UPDATE Users 
SET PasswordHash = '8C6AnWu/IVrL8EM5A/IfD4ryJTLZ1igrkmqxhCwHRzg='
WHERE Username = 'admin';
GO

-- Verify the update
SELECT 
    Id,
    Username,
    Email,
    PasswordHash,
    FullName,
    Role,
    IsActive
FROM Users 
WHERE Username = 'admin';
GO

PRINT 'Password updated successfully!';
PRINT 'You can now login with:';
PRINT '  Username: admin';
PRINT '  Password: vivify';
PRINT '';
PRINT 'Expected PasswordHash: 8C6AnWu/IVrL8EM5A/IfD4ryJTLZ1igrkmqxhCwHRzg=';
GO
