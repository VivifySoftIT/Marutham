-- Alaigal Database Creation Script
-- Database: Alaigal

USE Alaigal;
GO

-- Drop existing tables if they exist (in correct order due to foreign keys)
IF OBJECT_ID('dbo.Attendance', 'U') IS NOT NULL DROP TABLE dbo.Attendance;
IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL DROP TABLE dbo.Payments;
IF OBJECT_ID('dbo.Members', 'U') IS NOT NULL DROP TABLE dbo.Members;
IF OBJECT_ID('dbo.Batches', 'U') IS NOT NULL DROP TABLE dbo.Batches;
IF OBJECT_ID('dbo.Inventory', 'U') IS NOT NULL DROP TABLE dbo.Inventory;
IF OBJECT_ID('dbo.Notices', 'U') IS NOT NULL DROP TABLE dbo.Notices;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

-- Create Users Table
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
GO

-- Create Members Table
CREATE TABLE Members (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    MemberId NVARCHAR(50) NOT NULL UNIQUE,
    Phone NVARCHAR(15) NOT NULL,
    Email NVARCHAR(100),
    JoinDate DATETIME NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active',
    FeesStatus NVARCHAR(50) NOT NULL DEFAULT 'Unpaid',
    Address NVARCHAR(500),
    Batch NVARCHAR(50),
    Business NVARCHAR(100),
    ReferenceId INT,
    ProfileImage NVARCHAR(500),
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedBy NVARCHAR(100),
    CreatedDate DATETIME NOT NULL DEFAULT GETUTCDATE(),
    UpdatedBy NVARCHAR(100),
    UpdatedDate DATETIME
);
GO

CREATE INDEX IX_Members_MemberId ON Members(MemberId);
CREATE INDEX IX_Members_Email ON Members(Email);
CREATE INDEX IX_Members_Phone ON Members(Phone);
GO

-- Create Payments Table
CREATE TABLE Payments (
    Id INT PRIMARY KEY IDENTITY(1,1),
    MemberId INT NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    PaymentDate DATETIME NOT NULL,
    PaymentMethod NVARCHAR(50) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Completed',
    ReceiptNo NVARCHAR(100) UNIQUE,
    Description NVARCHAR(500),
    TransactionId NVARCHAR(100),
    NextDueDate DATETIME,
    Notes NVARCHAR(500),
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedBy NVARCHAR(100),
    CreatedDate DATETIME NOT NULL DEFAULT GETUTCDATE(),
    UpdatedBy NVARCHAR(100),
    UpdatedDate DATETIME,
    CONSTRAINT FK_Payments_Members FOREIGN KEY (MemberId) REFERENCES Members(Id)
);
GO

CREATE INDEX IX_Payments_MemberId ON Payments(MemberId);
CREATE INDEX IX_Payments_ReceiptNo ON Payments(ReceiptNo);
GO

-- Create Attendance Table
CREATE TABLE Attendance (
    Id INT PRIMARY KEY IDENTITY(1,1),
    MemberId INT NOT NULL,
    AttendanceDate DATETIME NOT NULL,
    CheckInTime TIME,
    CheckOutTime TIME,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Present',
    Notes NVARCHAR(500),
    Batch NVARCHAR(50),
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedBy NVARCHAR(100),
    CreatedDate DATETIME NOT NULL DEFAULT GETUTCDATE(),
    UpdatedBy NVARCHAR(100),
    UpdatedDate DATETIME,
    CONSTRAINT FK_Attendance_Members FOREIGN KEY (MemberId) REFERENCES Members(Id)
);
GO

CREATE INDEX IX_Attendance_MemberId_Date ON Attendance(MemberId, AttendanceDate);
GO

-- Create Batches Table
CREATE TABLE Batches (
    Id INT PRIMARY KEY IDENTITY(1,1),
    BatchName NVARCHAR(100) NOT NULL,
    BatchCode NVARCHAR(50) UNIQUE,
    StartTime TIME,
    EndTime TIME,
    Description NVARCHAR(500),
    Capacity INT,
    CurrentMembers INT NOT NULL DEFAULT 0,
    Instructor NVARCHAR(100),
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedBy NVARCHAR(100),
    CreatedDate DATETIME NOT NULL DEFAULT GETUTCDATE(),
    UpdatedBy NVARCHAR(100),
    UpdatedDate DATETIME
);
GO

CREATE INDEX IX_Batches_BatchCode ON Batches(BatchCode);
GO

-- Create Inventory Table
CREATE TABLE Inventory (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ItemName NVARCHAR(100) NOT NULL,
    ItemCode NVARCHAR(50),
    Category NVARCHAR(100),
    Quantity INT NOT NULL DEFAULT 0,
    MinimumStock INT,
    UnitPrice DECIMAL(18,2),
    Unit NVARCHAR(50),
    Description NVARCHAR(500),
    Supplier NVARCHAR(100),
    LastRestockDate DATETIME,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedBy NVARCHAR(100),
    CreatedDate DATETIME NOT NULL DEFAULT GETUTCDATE(),
    UpdatedBy NVARCHAR(100),
    UpdatedDate DATETIME
);
GO

-- Create Notices Table
CREATE TABLE Notices (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    NoticeType NVARCHAR(50) NOT NULL DEFAULT 'General',
    ScheduledDate DATETIME,
    IsSent BIT NOT NULL DEFAULT 0,
    SentDate DATETIME,
    TargetAudience NVARCHAR(50),
    RecipientCount INT,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedBy NVARCHAR(100),
    CreatedDate DATETIME NOT NULL DEFAULT GETUTCDATE(),
    UpdatedBy NVARCHAR(100),
    UpdatedDate DATETIME
);
GO

-- Insert Sample Data

-- Insert default admin user (password: Admin@123)
INSERT INTO Users (Username, Email, PasswordHash, FullName, Role, CreatedDate)
VALUES ('admin', 'admin@alaigal.com', 'jGl25bVBBBW96Qi9Te4V37Fnqchz/Eu4qB9vKrRIqRg=', 'Administrator', 'Admin', GETUTCDATE());
GO

-- Insert sample batches
INSERT INTO Batches (BatchName, BatchCode, StartTime, EndTime, Description, Capacity, Instructor, CreatedDate)
VALUES 
('Morning Batch', 'BATCH001', '06:00:00', '08:00:00', 'Early morning training session', 30, 'John Trainer', GETUTCDATE()),
('Evening Batch', 'BATCH002', '18:00:00', '20:00:00', 'Evening training session', 25, 'Sarah Coach', GETUTCDATE()),
('Weekend Batch', 'BATCH003', '09:00:00', '11:00:00', 'Weekend special session', 20, 'Mike Instructor', GETUTCDATE());
GO

-- Insert sample members
INSERT INTO Members (Name, MemberId, Phone, Email, JoinDate, Status, FeesStatus, Address, Batch, Business, CreatedDate)
VALUES 
('Rajesh Kumar', 'MEM001', '9876543210', 'rajesh@example.com', '2024-01-15', 'Active', 'Paid', '123 MG Road, Delhi', 'Morning', 'Business Owner', GETUTCDATE()),
('Priya Sharma', 'MEM002', '9876543211', 'priya@example.com', '2024-02-20', 'Active', 'Paid', '456 Park Street, Mumbai', 'Evening', 'Software Engineer', GETUTCDATE()),
('Amit Patel', 'MEM003', '9876543212', 'amit@example.com', '2024-03-10', 'Pending', 'Unpaid', '789 Lake View, Bangalore', 'Morning', 'Doctor', GETUTCDATE());
GO

-- Insert sample payments
INSERT INTO Payments (MemberId, Amount, PaymentDate, PaymentMethod, Status, ReceiptNo, Description, CreatedDate)
VALUES 
(1, 5000.00, '2024-06-01', 'Cash', 'Completed', 'RCP000001', 'Monthly Membership Fee', GETUTCDATE()),
(2, 5000.00, '2024-06-05', 'UPI', 'Completed', 'RCP000002', 'Monthly Membership Fee', GETUTCDATE());
GO

-- Insert sample attendance
INSERT INTO Attendance (MemberId, AttendanceDate, CheckInTime, CheckOutTime, Status, Batch, CreatedDate)
VALUES 
(1, CAST(GETDATE() AS DATE), '06:15:00', '07:45:00', 'Present', 'Morning', GETUTCDATE()),
(2, CAST(GETDATE() AS DATE), '18:10:00', '19:50:00', 'Present', 'Evening', GETUTCDATE());
GO

-- Insert sample inventory
INSERT INTO Inventory (ItemName, ItemCode, Category, Quantity, MinimumStock, UnitPrice, Unit, Description, CreatedDate)
VALUES 
('Yoga Mat', 'INV001', 'Equipment', 50, 10, 500.00, 'Piece', 'Premium yoga mats', GETUTCDATE()),
('Dumbbells 5kg', 'INV002', 'Equipment', 30, 5, 800.00, 'Pair', '5kg dumbbells set', GETUTCDATE()),
('Resistance Bands', 'INV003', 'Equipment', 40, 10, 300.00, 'Piece', 'Elastic resistance bands', GETUTCDATE());
GO

-- Insert sample notice
INSERT INTO Notices (Title, Message, NoticeType, ScheduledDate, IsSent, CreatedDate)
VALUES 
('Welcome to Alaigal', 'Welcome to our fitness center. We are excited to have you join us!', 'General', GETUTCDATE(), 1, GETUTCDATE()),
('Holiday Notice', 'The center will be closed on 15th August for Independence Day.', 'Announcement', '2024-08-10', 0, GETUTCDATE());
GO

PRINT 'Database tables created and sample data inserted successfully!';
GO
