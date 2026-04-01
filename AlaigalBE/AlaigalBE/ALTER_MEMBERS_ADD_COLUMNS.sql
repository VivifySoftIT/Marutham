-- =============================================
-- ALTER MEMBERS TABLE - ADD NEW COLUMNS
-- Run this to add new columns to existing Members table
-- =============================================

USE Alaigal;
GO

-- Add Password column for member login
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'Password')
BEGIN
    ALTER TABLE Members ADD Password NVARCHAR(255) NULL;
    PRINT 'Added Password column';
END
ELSE
    PRINT 'Password column already exists';
GO

-- Add BusinessCategory column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'BusinessCategory')
BEGIN
    ALTER TABLE Members ADD BusinessCategory NVARCHAR(100) NULL;
    PRINT 'Added BusinessCategory column';
END
ELSE
    PRINT 'BusinessCategory column already exists';
GO

-- Add MembershipType column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'MembershipType')
BEGIN
    ALTER TABLE Members ADD MembershipType NVARCHAR(20) DEFAULT 'Monthly' NULL;
    PRINT 'Added MembershipType column';
END
ELSE
    PRINT 'MembershipType column already exists';
GO

-- Add MembershipStartDate column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'MembershipStartDate')
BEGIN
    ALTER TABLE Members ADD MembershipStartDate DATETIME NULL;
    PRINT 'Added MembershipStartDate column';
END
ELSE
    PRINT 'MembershipStartDate column already exists';
GO

-- Add MembershipEndDate column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'MembershipEndDate')
BEGIN
    ALTER TABLE Members ADD MembershipEndDate DATETIME NULL;
    PRINT 'Added MembershipEndDate column';
END
ELSE
    PRINT 'MembershipEndDate column already exists';
GO

-- Add ReferralGivenCount column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'ReferralGivenCount')
BEGIN
    ALTER TABLE Members ADD ReferralGivenCount INT DEFAULT 0 NOT NULL;
    PRINT 'Added ReferralGivenCount column';
END
ELSE
    PRINT 'ReferralGivenCount column already exists';
GO

-- Add ReferralReceivedCount column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'ReferralReceivedCount')
BEGIN
    ALTER TABLE Members ADD ReferralReceivedCount INT DEFAULT 0 NOT NULL;
    PRINT 'Added ReferralReceivedCount column';
END
ELSE
    PRINT 'ReferralReceivedCount column already exists';
GO

-- Add TYFCBGivenCount column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'TYFCBGivenCount')
BEGIN
    ALTER TABLE Members ADD TYFCBGivenCount INT DEFAULT 0 NOT NULL;
    PRINT 'Added TYFCBGivenCount column';
END
ELSE
    PRINT 'TYFCBGivenCount column already exists';
GO

-- Add TYFCBReceivedCount column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'TYFCBReceivedCount')
BEGIN
    ALTER TABLE Members ADD TYFCBReceivedCount INT DEFAULT 0 NOT NULL;
    PRINT 'Added TYFCBReceivedCount column';
END
ELSE
    PRINT 'TYFCBReceivedCount column already exists';
GO

-- Add CEUsCount column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'CEUsCount')
BEGIN
    ALTER TABLE Members ADD CEUsCount INT DEFAULT 0 NOT NULL;
    PRINT 'Added CEUsCount column';
END
ELSE
    PRINT 'CEUsCount column already exists';
GO

-- Add VisitorsCount column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'VisitorsCount')
BEGIN
    ALTER TABLE Members ADD VisitorsCount INT DEFAULT 0 NOT NULL;
    PRINT 'Added VisitorsCount column';
END
ELSE
    PRINT 'VisitorsCount column already exists';
GO

-- Add RevenueReceived column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Members') AND name = 'RevenueReceived')
BEGIN
    ALTER TABLE Members ADD RevenueReceived DECIMAL(18,2) DEFAULT 0 NOT NULL;
    PRINT 'Added RevenueReceived column';
END
ELSE
    PRINT 'RevenueReceived column already exists';
GO

PRINT '';
PRINT '==============================================';
PRINT 'Members table updated successfully!';
PRINT '==============================================';
PRINT '';

-- Show current Members table structure
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Members'
ORDER BY ORDINAL_POSITION;
GO
