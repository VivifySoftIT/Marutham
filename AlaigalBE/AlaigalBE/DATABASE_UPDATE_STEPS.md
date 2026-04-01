# Database Update Steps

## ⚠️ Important: Run Scripts in This Order

Your existing Members table has data and foreign key constraints, so we need to update it carefully.

---

## Step 1: Add New Columns to Members Table

**File:** `ALTER_MEMBERS_ADD_COLUMNS.sql`

This script adds these columns to your existing Members table:
- Password (for member login)
- BusinessCategory
- MembershipType (Monthly/Annual)
- MembershipStartDate
- MembershipEndDate
- ReferralGivenCount
- ReferralReceivedCount
- TYFCBGivenCount
- TYFCBReceivedCount
- CEUsCount
- VisitorsCount
- RevenueReceived

**How to run:**
1. Open SQL Server Management Studio
2. Connect to your database server (103.230.85.44)
3. Open `ALTER_MEMBERS_ADD_COLUMNS.sql`
4. Click Execute (F5)

**Expected output:**
```
Added Password column
Added BusinessCategory column
Added MembershipType column
...
Members table updated successfully!
```

---

## Step 2: Create New Tables

**File:** `CREATE_NEW_TABLES.sql`

This script creates 8 new tables:
1. **Referrals** - Track referrals between members
2. **TYFCB** - Track business visits
3. **CEUs** - Track education units
4. **OneToOneMeetings** - Track meetings
5. **Visitors** - Track visitors brought
6. **WeeklySlips** - Weekly activity reports
7. **PaymentReminders** - Payment reminder tracking
8. **MemberActivityLog** - Activity logging

**How to run:**
1. In SQL Server Management Studio
2. Open `CREATE_NEW_TABLES.sql`
3. Click Execute (F5)

**Expected output:**
```
Created Referrals table
Created TYFCB table
Created CEUs table
...
All new tables created successfully!
```

---

## Step 3: Verify Tables Created

Run this query to check all tables exist:

```sql
USE Alaigal;
GO

SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
```

**You should see:**
- Attendance
- Batches
- CEUs
- Inventory
- MemberActivityLog
- Members
- Notices
- OneToOneMeetings
- PaymentReminders
- Payments
- Referrals
- TYFCB
- Users
- Visitors
- WeeklySlips

---

## Step 4: Check Members Table Columns

Run this query to verify new columns were added:

```sql
USE Alaigal;
GO

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Members'
ORDER BY ORDINAL_POSITION;
```

**Look for these new columns:**
- Password
- BusinessCategory
- MembershipType
- ReferralGivenCount
- ReferralReceivedCount
- TYFCBGivenCount
- TYFCBReceivedCount
- CEUsCount
- VisitorsCount
- RevenueReceived

---

## Step 5: Set Default Passwords for Existing Members (Optional)

If you want existing members to be able to login, set their passwords:

```sql
USE Alaigal;
GO

-- Set default password 'vivify' (hashed) for all members
UPDATE Members 
SET Password = '8C6AnWu/IVrL8EM5A/IfD4ryJTLZ1igrkmqxhCwHRzg='
WHERE Password IS NULL;

-- Or set individual passwords
UPDATE Members 
SET Password = '8C6AnWu/IVrL8EM5A/IfD4ryJTLZ1igrkmqxhCwHRzg=' -- 'vivify'
WHERE MemberId = 'MEM001';
```

---

## Troubleshooting

### Error: "Could not drop object 'Members'"
**Solution:** Don't worry! This is expected. The ALTER script doesn't drop the table, it only adds columns.

### Error: "Column already exists"
**Solution:** The script checks if columns exist before adding them. This message is normal if you run the script twice.

### Error: "Invalid column name"
**Solution:** Run Step 1 (ALTER_MEMBERS_ADD_COLUMNS.sql) first before Step 2.

### Error: "Foreign key constraint"
**Solution:** Make sure Members table exists before creating new tables.

---

## What's Next?

After running these scripts:

1. ✅ Database is ready
2. ✅ All tables created
3. ✅ Sample data inserted

Next steps:
- Update AlaigalContext.cs to include new DbSets
- Create controllers for new features
- Build member login system
- Create member dashboard screens

---

## Quick Test Query

Run this to see sample data:

```sql
USE Alaigal;
GO

-- Check members
SELECT Id, MemberId, Name, ReferralGivenCount, ReferralReceivedCount 
FROM Members;

-- Check referrals
SELECT * FROM Referrals;

-- Check TYFCB
SELECT * FROM TYFCB;

-- Check CEUs
SELECT * FROM CEUs;
```

---

## Backup Recommendation

Before running any scripts, backup your database:

```sql
BACKUP DATABASE Alaigal 
TO DISK = 'C:\Backup\Alaigal_Backup_BeforeUpdate.bak'
WITH FORMAT, INIT, NAME = 'Alaigal Before Update';
```

---

That's it! Your database will be ready for the complete Alaigal system.
