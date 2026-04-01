-- =============================================
-- CREATE NEW TABLES FOR ALAIGAL SYSTEM
-- Creates: Referrals, TYFCB, CEUs, OneToOneMeetings, 
--          Visitors, WeeklySlips, PaymentReminders, MemberActivityLog
-- =============================================

USE Alaigal;
GO

-- =============================================
-- 1. REFERRALS TABLE
-- =============================================
IF OBJECT_ID('Referrals', 'U') IS NOT NULL 
    DROP TABLE Referrals;
GO

CREATE TABLE Referrals (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ReferralCode NVARCHAR(50) UNIQUE NOT NULL,
    
    -- Who gave the referral
    GivenByMemberId INT NOT NULL,
    FOREIGN KEY (GivenByMemberId) REFERENCES Members(Id),
    
    -- Who received the referral
    ReceivedByMemberId INT NOT NULL,
    FOREIGN KEY (ReceivedByMemberId) REFERENCES Members(Id),
    
    -- Referral Details
    ClientName NVARCHAR(100),
    ClientPhone NVARCHAR(20),
    ClientEmail NVARCHAR(100),
    BusinessType NVARCHAR(100),
    ReferralDate DATETIME DEFAULT GETDATE(),
    
    -- Status tracking
    Status NVARCHAR(20) DEFAULT 'Pending', -- Pending/Contacted/Converted/Closed
    Revenue DECIMAL(18,2) DEFAULT 0,
    Notes NVARCHAR(1000),
    
    -- Audit
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME
);
GO

PRINT 'Created Referrals table';
GO

-- =============================================
-- 2. TYFCB TABLE
-- =============================================
IF OBJECT_ID('TYFCB', 'U') IS NOT NULL 
    DROP TABLE TYFCB;
GO

CREATE TABLE TYFCB (
    Id INT PRIMARY KEY IDENTITY(1,1),
    
    -- Who gave TYFCB
    GivenByMemberId INT NOT NULL,
    FOREIGN KEY (GivenByMemberId) REFERENCES Members(Id),
    
    -- Who received TYFCB
    ReceivedByMemberId INT NOT NULL,
    FOREIGN KEY (ReceivedByMemberId) REFERENCES Members(Id),
    
    -- Details
    VisitDate DATETIME DEFAULT GETDATE(),
    BusinessVisited NVARCHAR(200),
    Notes NVARCHAR(1000),
    Rating INT, -- 1-5 stars
    
    -- Audit
    CreatedDate DATETIME DEFAULT GETDATE()
);
GO

PRINT 'Created TYFCB table';
GO

-- =============================================
-- 3. CEUs TABLE
-- =============================================
IF OBJECT_ID('CEUs', 'U') IS NOT NULL 
    DROP TABLE CEUs;
GO

CREATE TABLE CEUs (
    Id INT PRIMARY KEY IDENTITY(1,1),
    MemberId INT NOT NULL,
    FOREIGN KEY (MemberId) REFERENCES Members(Id),
    
    -- CEU Details
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(1000),
    CEUType NVARCHAR(50), -- Workshop/Seminar/Training/Conference
    CEUPoints DECIMAL(5,2) DEFAULT 1.0,
    EventDate DATETIME,
    Duration INT, -- in minutes
    
    -- Audit
    CreatedDate DATETIME DEFAULT GETDATE()
);
GO

PRINT 'Created CEUs table';
GO

-- =============================================
-- 4. ONE-TO-ONE MEETINGS TABLE
-- =============================================
IF OBJECT_ID('OneToOneMeetings', 'U') IS NOT NULL 
    DROP TABLE OneToOneMeetings;
GO

CREATE TABLE OneToOneMeetings (
    Id INT PRIMARY KEY IDENTITY(1,1),
    
    -- Meeting participants
    Member1Id INT NOT NULL,
    FOREIGN KEY (Member1Id) REFERENCES Members(Id),
    
    Member2Id INT NOT NULL,
    FOREIGN KEY (Member2Id) REFERENCES Members(Id),
    
    -- Meeting Details
    MeetingDate DATETIME NOT NULL,
    Location NVARCHAR(200),
    Duration INT, -- in minutes
    Notes NVARCHAR(1000),
    Status NVARCHAR(20) DEFAULT 'Scheduled', -- Scheduled/Completed/Cancelled
    
    -- Audit
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME
);
GO

PRINT 'Created OneToOneMeetings table';
GO

-- =============================================
-- 5. VISITORS TABLE
-- =============================================
IF OBJECT_ID('Visitors', 'U') IS NOT NULL 
    DROP TABLE Visitors;
GO

CREATE TABLE Visitors (
    Id INT PRIMARY KEY IDENTITY(1,1),
    
    -- Who brought the visitor
    BroughtByMemberId INT NOT NULL,
    FOREIGN KEY (BroughtByMemberId) REFERENCES Members(Id),
    
    -- Visitor Details
    VisitorName NVARCHAR(100) NOT NULL,
    VisitorPhone NVARCHAR(20),
    VisitorEmail NVARCHAR(100),
    VisitorBusiness NVARCHAR(200),
    VisitDate DATETIME DEFAULT GETDATE(),
    
    -- Follow-up
    BecameMember BIT DEFAULT 0,
    MemberId INT NULL,
    FOREIGN KEY (MemberId) REFERENCES Members(Id),
    
    Notes NVARCHAR(1000),
    
    -- Audit
    CreatedDate DATETIME DEFAULT GETDATE()
);
GO

PRINT 'Created Visitors table';
GO

-- =============================================
-- 6. WEEKLY SLIPS TABLE
-- =============================================
IF OBJECT_ID('WeeklySlips', 'U') IS NOT NULL 
    DROP TABLE WeeklySlips;
GO

CREATE TABLE WeeklySlips (
    Id INT PRIMARY KEY IDENTITY(1,1),
    MemberId INT NOT NULL,
    FOREIGN KEY (MemberId) REFERENCES Members(Id),
    
    -- Week Details
    WeekStartDate DATE NOT NULL,
    WeekEndDate DATE NOT NULL,
    
    -- Slip Data
    ReferralsGiven INT DEFAULT 0,
    TYFCBGiven INT DEFAULT 0,
    VisitorsBrought INT DEFAULT 0,
    OneToOnesMet INT DEFAULT 0,
    
    -- Revenue
    RevenueGenerated DECIMAL(18,2) DEFAULT 0,
    
    -- Status
    SubmittedDate DATETIME,
    Status NVARCHAR(20) DEFAULT 'Draft', -- Draft/Submitted/Approved
    
    Notes NVARCHAR(1000),
    
    -- Audit
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME
);
GO

PRINT 'Created WeeklySlips table';
GO

-- =============================================
-- 7. PAYMENT REMINDERS TABLE
-- =============================================
IF OBJECT_ID('PaymentReminders', 'U') IS NOT NULL 
    DROP TABLE PaymentReminders;
GO

CREATE TABLE PaymentReminders (
    Id INT PRIMARY KEY IDENTITY(1,1),
    MemberId INT NOT NULL,
    FOREIGN KEY (MemberId) REFERENCES Members(Id),
    
    -- Reminder Details
    ReminderType NVARCHAR(20), -- Due/Overdue/Final
    SentDate DATETIME DEFAULT GETDATE(),
    EmailSent BIT DEFAULT 0,
    SMSSent BIT DEFAULT 0,
    
    DueAmount DECIMAL(18,2),
    DueDate DATE,
    
    -- Audit
    CreatedBy NVARCHAR(100),
    CreatedDate DATETIME DEFAULT GETDATE()
);
GO

PRINT 'Created PaymentReminders table';
GO

-- =============================================
-- 8. MEMBER ACTIVITY LOG
-- =============================================
IF OBJECT_ID('MemberActivityLog', 'U') IS NOT NULL 
    DROP TABLE MemberActivityLog;
GO

CREATE TABLE MemberActivityLog (
    Id INT PRIMARY KEY IDENTITY(1,1),
    MemberId INT NOT NULL,
    FOREIGN KEY (MemberId) REFERENCES Members(Id),
    
    ActivityType NVARCHAR(50) NOT NULL, -- Login/Referral/TYFCB/Payment/etc
    ActivityDescription NVARCHAR(500),
    ActivityDate DATETIME DEFAULT GETDATE(),
    
    -- Related IDs
    RelatedMemberId INT NULL,
    RelatedRecordId INT NULL,
    
    IPAddress NVARCHAR(50),
    DeviceInfo NVARCHAR(200)
);
GO

PRINT 'Created MemberActivityLog table';
GO

-- =============================================
-- CREATE INDEXES
-- =============================================
CREATE INDEX IX_Referrals_GivenBy ON Referrals(GivenByMemberId);
CREATE INDEX IX_Referrals_ReceivedBy ON Referrals(ReceivedByMemberId);
CREATE INDEX IX_Referrals_Date ON Referrals(ReferralDate);

CREATE INDEX IX_TYFCB_GivenBy ON TYFCB(GivenByMemberId);
CREATE INDEX IX_TYFCB_ReceivedBy ON TYFCB(ReceivedByMemberId);

CREATE INDEX IX_CEUs_Member ON CEUs(MemberId);

CREATE INDEX IX_OneToOne_Member1 ON OneToOneMeetings(Member1Id);
CREATE INDEX IX_OneToOne_Member2 ON OneToOneMeetings(Member2Id);

CREATE INDEX IX_Visitors_BroughtBy ON Visitors(BroughtByMemberId);

CREATE INDEX IX_WeeklySlips_Member ON WeeklySlips(MemberId);
CREATE INDEX IX_WeeklySlips_Week ON WeeklySlips(WeekStartDate);

CREATE INDEX IX_PaymentReminders_Member ON PaymentReminders(MemberId);

CREATE INDEX IX_ActivityLog_Member ON MemberActivityLog(MemberId);
CREATE INDEX IX_ActivityLog_Date ON MemberActivityLog(ActivityDate);

PRINT 'Created indexes';
GO

-- =============================================
-- INSERT SAMPLE DATA
-- =============================================

-- Get first 3 member IDs
DECLARE @Member1 INT = (SELECT TOP 1 Id FROM Members ORDER BY Id);
DECLARE @Member2 INT = (SELECT TOP 1 Id FROM Members WHERE Id > @Member1 ORDER BY Id);
DECLARE @Member3 INT = (SELECT TOP 1 Id FROM Members WHERE Id > @Member2 ORDER BY Id);

IF @Member1 IS NOT NULL AND @Member2 IS NOT NULL AND @Member3 IS NOT NULL
BEGIN
    -- Insert sample referrals
    INSERT INTO Referrals (ReferralCode, GivenByMemberId, ReceivedByMemberId, ClientName, ClientPhone, Status, Revenue)
    VALUES 
    ('REF' + CAST(NEWID() AS NVARCHAR(36)), @Member1, @Member2, 'Sample Client 1', '9999999991', 'Converted', 50000.00),
    ('REF' + CAST(NEWID() AS NVARCHAR(36)), @Member2, @Member3, 'Sample Client 2', '9999999992', 'Contacted', 0),
    ('REF' + CAST(NEWID() AS NVARCHAR(36)), @Member3, @Member1, 'Sample Client 3', '9999999993', 'Pending', 0);

    -- Insert sample TYFCB
    INSERT INTO TYFCB (GivenByMemberId, ReceivedByMemberId, BusinessVisited, Rating)
    VALUES 
    (@Member1, @Member2, 'Business Visit 1', 5),
    (@Member2, @Member3, 'Business Visit 2', 4);

    -- Insert sample CEUs
    INSERT INTO CEUs (MemberId, Title, CEUType, CEUPoints, EventDate)
    VALUES 
    (@Member1, 'Business Workshop', 'Workshop', 2.0, GETDATE()),
    (@Member2, 'Leadership Seminar', 'Seminar', 1.5, GETDATE());

    -- Update member statistics
    UPDATE Members SET 
        ReferralGivenCount = 1,
        ReferralReceivedCount = 1,
        TYFCBGivenCount = 1,
        TYFCBReceivedCount = 1,
        RevenueReceived = 50000.00
    WHERE Id = @Member1;

    UPDATE Members SET 
        ReferralGivenCount = 1,
        ReferralReceivedCount = 1,
        TYFCBGivenCount = 1,
        TYFCBReceivedCount = 1
    WHERE Id = @Member2;

    UPDATE Members SET 
        ReferralGivenCount = 1,
        ReferralReceivedCount = 1,
        TYFCBReceivedCount = 1
    WHERE Id = @Member3;

    PRINT 'Inserted sample data';
END
ELSE
BEGIN
    PRINT 'Not enough members to insert sample data. Add members first.';
END
GO

PRINT '';
PRINT '==============================================';
PRINT 'All new tables created successfully!';
PRINT '==============================================';
PRINT '';
PRINT 'Tables created:';
PRINT '  1. Referrals';
PRINT '  2. TYFCB';
PRINT '  3. CEUs';
PRINT '  4. OneToOneMeetings';
PRINT '  5. Visitors';
PRINT '  6. WeeklySlips';
PRINT '  7. PaymentReminders';
PRINT '  8. MemberActivityLog';
PRINT '';
PRINT 'Next step: Run ALTER_MEMBERS_ADD_COLUMNS.sql';
GO
