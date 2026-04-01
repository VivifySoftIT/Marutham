-- Insert Test User for Alaigal
-- This script creates a test admin user

USE Alaigal;
GO

-- Delete existing admin user if exists
DELETE FROM Users WHERE Username = 'admin';
GO

-- Insert admin user
-- Username: admin
-- Password: vivify
-- Password Hash is SHA256 of "vivify"
INSERT INTO Users (Username, Email, PasswordHash, FullName, Role, IsActive, CreatedDate)
VALUES (
    'admin', 
    'admin@alaigal.com', 
    'pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=', -- SHA256 hash of "vivify"
    'Administrator', 
    'Admin', 
    1, 
    GETUTCDATE()
);
GO

-- Verify the user was created
SELECT Id, Username, Email, FullName, Role, IsActive, CreatedDate 
FROM Users 
WHERE Username = 'admin';
GO

PRINT 'Test user created successfully!';
PRINT 'Username: admin';
PRINT 'Password: vivify';
GO
