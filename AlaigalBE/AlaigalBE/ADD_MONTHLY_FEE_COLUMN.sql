-- Add MonthlyFee column to SubCompanies table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SubCompanies') AND name = 'MonthlyFee')
BEGIN
    ALTER TABLE SubCompanies ADD MonthlyFee DECIMAL(18,2) NULL;
    PRINT 'Added MonthlyFee column to SubCompanies';
END
