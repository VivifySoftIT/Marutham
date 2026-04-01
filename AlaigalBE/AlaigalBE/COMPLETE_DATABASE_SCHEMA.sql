-- =============================================
-- ALAIGAL COMPLETE DATABASE SCHEMA
-- Member Networking & Tracking System
-- =============================================

USE Alaigal;
GO

-- =============================================
-- 1. MEMBERS TABLE (Enhanced)
-- =============================================
IF OBJECT_ID('Members', 'U') IS NOT NULL DROP TABLE Members;
GO

CREATE TABLE Members (
    Id INT PRIMARY KEY IDENTITY(1,1),
    MemberId NVARCHAR(50) UNIQUE NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100),
    Phone NVARCHAR(20) NOT NULL,
    Password NVARCHAR(255), -- For member login
    Business NVARCHAR(200),
    BusinessCategory NVARCHAR(100),
    Address NVARCHAR(500),
    JoinDate DATETIME NOT NULL DEFAULT GETDATE(),
    Batch NVARCHAR(50),
    Status NVARCHAR(20) DEFAULT 'Active',
    FeesStatus NVARCHAR(20) DEFAULT 'Unpaid',
    ProfileImage NVARCHAR(500),
    
    -- Membership Details
    MembershipType NVARCHAR(20) DEFAULT 'Monthly', -- Monthly/Annual
    MembershipStartDate DATETIME,
    MembershipEndDate DATETIME,
    
    -- Statistics
    ReferralGivenCount INT DEFAULT 0,
    ReferralReceivedCount INT DEFAULT 0,
    TYFCBGivenCount INT DEFAULT 0,
    TYFCBReceivedCount INT DEFAULT 0,
    CEUsCount INT DEFAULT 0,
    VisitorsCount INT DEFAULT 0,
    RevenueReceived DECIMAL(18,2) DEFAULT 0,
    
    -- Audit
    CreatedBy NVARCHAR(100),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedBy NVARCHAR(100),
    UpdatedDate DATETIME,
    IsActive BIT DEFAULT 1
);
GO

-- =============================================
-- 2. REFERRALS TABLE
-- Track referrals given and received between members
-- =============================================
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

-- =============================================
-- 3. TYFCB (Thank You For Coming By) TABLE
-- Track TYFCB exchanges between members
-- =============================================
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

-- =============================================
-- 4. CEUs (Continuing Education Units) TABLE
-- Track CEU activities
-- =============================================
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

-- =============================================
-- 5. ONE-TO-ONE MEETINGS TABLE
-- Track one-to-one meetings between members
-- =============================================
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

-- =============================================
-- 6. VISITORS TABLE
-- Track visitors brought by members
-- =============================================
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

-- =============================================
-- 7. WEEKLY SLIPS TABLE
-- Track weekly activity slips
-- =============================================
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

-- =============================================
-- 8. MEMBER PAYMENTS TABLE (Enhanced)
-- Track membership fee payments
-- =============================================
IF OBJECT_ID('Payments', 'U') IS NOT NULL DROP TABLE Payments;
GO

CREATE TABLE Payments (
    Id INT PRIMARY KEY IDENTITY(1,1),
    PaymentId NVARCHAR(50) UNIQUE NOT NULL,
    MemberId INT NOT NULL,
    FOREIGN KEY (MemberId) REFERENCES Members(Id),
    
    -- Payment Details
    Amount DECIMAL(18,2) NOT NULL,
    PaymentType NVARCHAR(20) NOT NULL, -- Monthly/Annual
    PaymentMethod NVARCHAR(50), -- Cash/Card/UPI/Bank Transfer
    TransactionId NVARCHAR(100),
    
    -- Period
    PaymentForMonth INT, -- 1-12
    PaymentForYear INT,
    PeriodStartDate DATE,
    PeriodEndDate DATE,
    
    -- Status
    PaymentDate DATETIME DEFAULT GETDATE(),
    Status NVARCHAR(20) DEFAULT 'Paid', -- Paid/Pending/Failed/Refunded
    
    -- Receipt
    ReceiptNumber NVARCHAR(50),
    ReceiptUrl NVARCHAR(500),
    
    Notes NVARCHAR(500),
    
    -- Audit
    CreatedBy NVARCHAR(100),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedBy NVARCHAR(100),
    UpdatedDate DATETIME
);
GO

-- =============================================
-- 9. PAYMENT REMINDERS TABLE
-- Track payment reminder emails sent
-- =============================================
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

-- =============================================
-- 10. MEMBER ACTIVITY LOG
-- Track all member activities for reporting
-- =============================================
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

-- =============================================
-- INDEXES for Performance
-- =============================================
CREATE INDEX IX_Members_Email ON Members(Email);
CREATE INDEX IX_Members_Phone ON Members(Phone);
CREATE INDEX IX_Members_Status ON Members(Status);
CREATE INDEX IX_Members_Business ON Members(Business);

CREATE INDEX IX_Referrals_GivenBy ON Referrals(GivenByMemberId);
CREATE INDEX IX_Referrals_ReceivedBy ON Referrals(ReceivedByMemberId);
CREATE INDEX IX_Referrals_Date ON Referrals(ReferralDate);

CREATE INDEX IX_TYFCB_GivenBy ON TYFCB(GivenByMemberId);
CREATE INDEX IX_TYFCB_ReceivedBy ON TYFCB(ReceivedByMemberId);

CREATE INDEX IX_Payments_Member ON Payments(MemberId);
CREATE INDEX IX_Payments_Date ON Payments(PaymentDate);
CREATE INDEX IX_Payments_Status ON Payments(Status);

CREATE INDEX IX_WeeklySlips_Member ON WeeklySlips(MemberId);
CREATE INDEX IX_WeeklySlips_Week ON WeeklySlips(WeekStartDate);

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample members
INSERT INTO Members (MemberId, Name, Email, Phone, Password, Business, BusinessCategory, JoinDate, Status, MembershipType)
VALUES 
('MEM001', 'Rajesh Kumar', 'rajesh@example.com', '9876543210', '8C6AnWu/IVrL8EM5A/IfD4ryJTLZ1igrkmqxhCwHRzg=', 'Kumar Enterprises', 'Manufacturing', GETDATE(), 'Active', 'Annual'),
('MEM002', 'Priya Sharma', 'priya@example.com', '9876543211', '8C6AnWu/IVrL8EM5A/IfD4ryJTLZ1igrkmqxhCwHRzg=', 'Sharma Consultancy', 'Consulting', GETDATE(), 'Active', 'Monthly'),
('MEM003', 'Amit Patel', 'amit@example.com', '9876543212', '8C6AnWu/IVrL8EM5A/IfD4ryJTLZ1igrkmqxhCwHRzg=', 'Patel Medical Center', 'Healthcare', GETDATE(), 'Active', 'Annual');

-- Insert sample referrals
INSERT INTO Referrals (ReferralCode, GivenByMemberId, ReceivedByMemberId, ClientName, ClientPhone, Status, Revenue)
VALUES 
('REF001', 1, 2, 'John Doe', '9999999991', 'Converted', 50000.00),
('REF002', 2, 3, 'Jane Smith', '9999999992', 'Contacted', 0),
('REF003', 3, 1, 'Bob Johnson', '9999999993', 'Pending', 0);

-- Update member statistics
UPDATE Members SET 
    ReferralGivenCount = 1,
    ReferralReceivedCount = 1,
    RevenueReceived = 50000.00
WHERE Id = 1;

UPDATE Members SET 
    ReferralGivenCount = 1,
    ReferralReceivedCount = 1
WHERE Id = 2;

UPDATE Members SET 
    ReferralGivenCount = 1,
    ReferralReceivedCount = 1
WHERE Id = 3;

PRINT 'Database schema created successfully!';
GO
