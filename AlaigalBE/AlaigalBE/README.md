# Alaigal Backend API

.NET Core Web API for Alaigal Gym/Fitness Management System

## Database Setup

### 1. Create Database
```sql
CREATE DATABASE Alaigal;
GO
```

### 2. Run Database Script
Execute the `DatabaseScript.sql` file in SQL Server Management Studio or using sqlcmd:
```bash
sqlcmd -S your_server -U sa -P your_password -d Alaigal -i DatabaseScript.sql
```

### 3. Update Connection String
Update the connection string in `appsettings.json`:
```json
"ConnectionStrings": {
    "AlaigalDb": "server=your_server;initial catalog=Alaigal;User Id=sa;Password=your_password;TrustServerCertificate=True"
}
```

## Database Tables

### Members
- Stores member information (name, contact, status, fees status)
- Unique MemberId for each member
- Tracks join date, batch, business details

### Payments
- Payment history for each member
- Auto-generated receipt numbers
- Supports multiple payment methods (Cash, UPI, Card, Bank Transfer)
- Tracks payment status and next due dates

### Attendance
- Daily attendance tracking
- Check-in/check-out times
- Status: Present, Absent, Late, Leave
- Linked to members and batches

### Batches
- Training batch management
- Time slots and capacity tracking
- Instructor assignment

### Inventory
- Equipment and supplies management
- Stock tracking with minimum stock alerts
- Pricing and supplier information

### Notices
- Announcements and notifications
- Scheduled sending
- Target audience selection

### Users
- Admin/staff user management
- Role-based access
- Password reset functionality

## API Endpoints

### Authentication
- `POST /api/Auth/login` - User login
- `POST /api/Auth/register` - Register new user
- `POST /api/Auth/forgot-password` - Request password reset
- `POST /api/Auth/reset-password` - Reset password with token
- `POST /api/Auth/change-password` - Change password

### Members
- `GET /api/Members` - Get all members
- `GET /api/Members/{id}` - Get member by ID
- `GET /api/Members/search?query=` - Search members
- `GET /api/Members/stats` - Get member statistics
- `POST /api/Members` - Create new member
- `PUT /api/Members/{id}` - Update member
- `DELETE /api/Members/{id}` - Soft delete member

### Payments
- `GET /api/Payments` - Get all payments
- `GET /api/Payments/{id}` - Get payment by ID
- `GET /api/Payments/member/{memberId}` - Get member payments
- `GET /api/Payments/member/{memberId}/summary` - Get payment summary
- `POST /api/Payments` - Create new payment
- `PUT /api/Payments/{id}` - Update payment
- `DELETE /api/Payments/{id}` - Soft delete payment

### Attendance
- `GET /api/Attendance?date=` - Get attendance records
- `GET /api/Attendance/{id}` - Get attendance by ID
- `GET /api/Attendance/member/{memberId}` - Get member attendance
- `GET /api/Attendance/report` - Get attendance report
- `POST /api/Attendance` - Mark attendance
- `POST /api/Attendance/bulk` - Bulk attendance marking
- `PUT /api/Attendance/{id}` - Update attendance
- `DELETE /api/Attendance/{id}` - Soft delete attendance

### Batches
- `GET /api/Batches` - Get all batches
- `GET /api/Batches/{id}` - Get batch by ID
- `POST /api/Batches` - Create new batch
- `PUT /api/Batches/{id}` - Update batch
- `DELETE /api/Batches/{id}` - Soft delete batch

### Inventory
- `GET /api/Inventory` - Get all inventory items
- `GET /api/Inventory/{id}` - Get item by ID
- `GET /api/Inventory/low-stock` - Get low stock items
- `POST /api/Inventory` - Create new item
- `PUT /api/Inventory/{id}` - Update item
- `DELETE /api/Inventory/{id}` - Soft delete item

### Notices
- `GET /api/Notices` - Get all notices
- `GET /api/Notices/{id}` - Get notice by ID
- `POST /api/Notices` - Create new notice
- `POST /api/Notices/{id}/send` - Send notice
- `PUT /api/Notices/{id}` - Update notice
- `DELETE /api/Notices/{id}` - Soft delete notice

## Running the Application

### Prerequisites
- .NET 8.0 SDK or later
- SQL Server 2019 or later

### Steps
1. Restore NuGet packages:
```bash
dotnet restore
```

2. Run database migrations (if using EF migrations):
```bash
dotnet ef database update
```

3. Run the application:
```bash
dotnet run
```

4. API will be available at:
   - HTTP: `http://localhost:5000`
   - HTTPS: `https://localhost:5001`

## Default Credentials
- Username: `admin`
- Password: `Admin@123`

## Features
- JWT Authentication
- CORS enabled for React Native app
- Soft delete (IsActive flag)
- Audit fields (CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
- Auto-generated receipt numbers
- Payment summary calculations
- Attendance reporting
- Low stock alerts

## Notes
- All dates are stored in UTC
- Soft delete is implemented (IsActive flag)
- Foreign key relationships are set with RESTRICT to prevent accidental deletions
- Unique indexes on important fields (MemberId, Email, Username, etc.)
