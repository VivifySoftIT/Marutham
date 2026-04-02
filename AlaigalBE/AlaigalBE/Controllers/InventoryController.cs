using System.Globalization;
using Alaigal.Data;
using Alaigal.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AlaigalBE.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly AlaigalRefContext _context;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(
        AlaigalRefContext context,
        ILogger<InventoryController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/Inventory
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Inventory>>> GetInventory()
    {
        return await _context.Inventory
            .Where(i => i.IsActive)
            .OrderBy(i => i.ItemName)
            .ToListAsync();
    }
    // GET: api/MemberStats/member/6
    // GET: api/Inventory/member/6
    [HttpGet("member/{memberId}")]
    public async Task<ActionResult<MemberStatsDto>> GetMemberStats(int memberId, [FromQuery] string? period = null)
    {
        try
        {
            // Validate member exists
            var memberExists = await _context.Members.AnyAsync(m => m.Id == memberId);
            if (!memberExists)
            {
                return NotFound(new { message = $"Member with ID {memberId} not found" });
            }

            var now = DateTime.UtcNow.Date;
            DateTime? start = null;
            DateTime? end = null;

            // Apply date range only if period is specified
            if (!string.IsNullOrWhiteSpace(period))
            {
                switch (period.Trim().ToLower())
                {
                    case "weekly":
                        start = now.AddDays(-7);
                        end = now;
                        break;
                    case "monthly":
                        start = new DateTime(now.Year, now.Month, 1);
                        end = start.Value.AddMonths(1).AddDays(-1);
                        break;
                    case "annual":
                        start = new DateTime(now.Year, 1, 1);
                        end = new DateTime(now.Year, 12, 31);
                        break;
                        // Optional: ignore invalid periods → treat as "all"
                }
            }

            // Include full end day (up to 23:59:59.9999999)
            DateTime? endOfDay = end?.AddDays(1).AddTicks(-1);

            // Build filtered queries
            var result = new MemberStatsDto
            {
                MemberId = memberId,

                ReferralsGiven = await _context.Referrals
                    .CountAsync(r => r.GivenByMemberId == memberId &&
                                    (!start.HasValue || r.CreatedDate >= start.Value) &&
                                    (!endOfDay.HasValue || r.CreatedDate <= endOfDay.Value)),

                ReferralsReceived = await _context.Referrals
                    .CountAsync(r => r.ReceivedByMemberId == memberId &&
                                    (!start.HasValue || r.CreatedDate >= start.Value) &&
                                    (!endOfDay.HasValue || r.CreatedDate <= endOfDay.Value)),

                ThanksGiven = await _context.TYFCB
                    .CountAsync(t => t.GivenByMemberId == memberId &&
                                    (!start.HasValue || t.VisitDate >= start.Value) &&
                                    (!endOfDay.HasValue || t.VisitDate <= endOfDay.Value)),

                ThanksReceived = await _context.TYFCB
                    .CountAsync(t => t.ReceivedByMemberId == memberId &&
                                    (!start.HasValue || t.VisitDate >= start.Value) &&
                                    (!endOfDay.HasValue || t.VisitDate <= endOfDay.Value)),
                BusinessesVisited = await _context.TYFCB
    .Where(t => t.GivenByMemberId == memberId &&
                t.Status == "Confirmed" && // ✅ Only confirmed records
                !string.IsNullOrWhiteSpace(t.BusinessVisited) &&
                (!start.HasValue || t.VisitDate >= start.Value) &&
                (!endOfDay.HasValue || t.VisitDate <= endOfDay.Value))
    .Select(t => t.BusinessVisited)
    .Distinct()
    .CountAsync(),

                CEUs = await _context.CEUs
                    .CountAsync(c => c.MemberId == memberId &&
                                    (!start.HasValue || c.CreatedDate >= start.Value) &&
                                    (!endOfDay.HasValue || c.CreatedDate <= endOfDay.Value)),

                Visitors = await _context.Visitors
                    .CountAsync(v => v.BroughtByMemberId == memberId &&
                                    (!start.HasValue || v.CreatedDate >= start.Value) &&
                                    (!endOfDay.HasValue || v.CreatedDate <= endOfDay.Value))
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error fetching stats for member {MemberId}, period: {Period}", memberId, period);
            return StatusCode(500, new { message = "Failed to load member statistics." });
        }
    }
    public class MemberStatsDto
    {
        public int MemberId { get; set; }

        public int ReferralsGiven { get; set; }
        public int ReferralsReceived { get; set; }

        public int ThanksGiven { get; set; }
        public int ThanksReceived { get; set; }
        public int BusinessesVisited { get; set; } // ✅ New field

        public int CEUs { get; set; }
        public int Visitors { get; set; }
    }
    [HttpPost("payments")]
    public async Task<ActionResult<Payment>> CreatePayment([FromBody] CreatePaymentDto dto)
    {
        try
        {
            // === VALIDATION ===
            if (dto == null)
                return BadRequest("Payment data is required.");

            if (dto.MemberId <= 0)
                return BadRequest("Valid MemberId is required.");

            if (dto.Amount <= 0)
                return BadRequest("Amount must be greater than zero.");

            if (string.IsNullOrWhiteSpace(dto.PaymentType))
                return BadRequest("Payment type is required.");

            // === FETCH MEMBER TO GET SubCompanyId AND VALIDATE ===
            var member = await _context.Members
                .Where(m => m.Id == dto.MemberId && m.IsActive)
                .Select(m => new { m.Id, m.SubCompanyId })
                .FirstOrDefaultAsync();

            if (member == null)
                return BadRequest($"Active member with ID {dto.MemberId} not found.");

            if (!member.SubCompanyId.HasValue)
                return BadRequest("Member is not associated with any sub-company.");

            // === HANDLE PAYMENT FOR MONTH & YEAR ===
            DateTime startDate, endDate;
            string? paymentForMonthStr = dto.PaymentForMonth?.Trim();
            string? normalizedMonthName = null;
            int paymentForYearStr;

            if (!string.IsNullOrWhiteSpace(paymentForMonthStr))
            {
                var culture = CultureInfo.InvariantCulture;
                var monthNames = culture.DateTimeFormat.MonthNames;
                var abbreviations = culture.DateTimeFormat.AbbreviatedMonthNames;

                int monthNum = -1;
                for (int i = 0; i < 12; i++)
                {
                    if (string.Equals(monthNames[i], paymentForMonthStr, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(abbreviations[i], paymentForMonthStr, StringComparison.OrdinalIgnoreCase))
                    {
                        monthNum = i + 1;
                        normalizedMonthName = abbreviations[i];
                        break;
                    }
                }

                if (monthNum == -1)
                    return BadRequest($"Invalid month: '{paymentForMonthStr}'. Use full or abbreviated name (e.g., 'January' or 'Jan').");

                int year = DateTime.UtcNow.Year;
                startDate = new DateTime(year, monthNum, 1);
                endDate = startDate.AddMonths(1).AddDays(-1);
                paymentForYearStr = year;
            }
            else
            {
                var now = DateTime.UtcNow;
                startDate = new DateTime(now.Year, now.Month, 1);
                endDate = startDate.AddMonths(1).AddDays(-1);
                normalizedMonthName = CultureInfo.InvariantCulture.DateTimeFormat.AbbreviatedMonthNames[startDate.Month - 1];
                paymentForYearStr = now.Year;
            }

            // === GENERATE UNIQUE RECEIPT NUMBER WITH RETRY ===
            string receiptNumber = "";
            bool receiptGenerated = false;
            int retryCount = 0;
            const int maxRetries = 5;

            while (!receiptGenerated && retryCount < maxRetries)
            {
                // Get last used receipt number
                var lastReceipt = await _context.Payments
                    .Where(p => p.ReceiptNumber != null && p.ReceiptNumber.StartsWith("ALAIGAL"))
                    .OrderByDescending(p => p.Id)
                    .Select(p => p.ReceiptNumber)
                    .FirstOrDefaultAsync();

                int nextNumber = 1000; // default start
                if (lastReceipt != null)
                {
                    string numericPart = lastReceipt.Replace("ALAIGAL", "");
                    if (int.TryParse(numericPart, out int lastNum))
                    {
                        nextNumber = lastNum + 1;
                    }
                }

                string candidate = $"ALAIGAL{nextNumber}";

                // Check if this candidate already exists (defensive check)
                bool alreadyExists = await _context.Payments.AnyAsync(p => p.ReceiptNumber == candidate);
                if (!alreadyExists)
                {
                    receiptNumber = candidate;
                    receiptGenerated = true;
                }
                else
                {
                    retryCount++;
                    if (retryCount < maxRetries)
                    {
                        // Small delay before retry to reduce collision chance
                        await Task.Delay(10 * retryCount);
                    }
                }
            }

            // Fallback: use timestamp if retries exhausted (should rarely happen)
            if (!receiptGenerated)
            {
                receiptNumber = $"ALAIGAL{DateTime.UtcNow:yyyyMMddHHmmssfff}";
            }

            // === CREATE PAYMENT ENTITY ===
            var payment = new Payment
            {
                MemberId = dto.MemberId,
                Amount = dto.Amount,
                PaymentMethod = dto.PaymentMethod?.Trim() ?? "Manual",
                TransactionId = dto.TransactionId?.Trim(),
                PaymentForMonth = normalizedMonthName,
                PaymentForYear = paymentForYearStr,
                PaymentStartDate = startDate,
                PaymentEndDate = endDate,
                PaymentDate = dto.PaymentDate ?? DateTime.UtcNow,
                Status = dto.Status ?? "Paid",
                ReceiptNumber = receiptNumber,
                Notes = dto.Notes?.Trim(),
                CreatedBy = dto.CreatedBy ?? "System",
                CreatedDate = DateTime.UtcNow,
                SubCompanyId = member.SubCompanyId.Value
            };

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, payment);
        }
        catch (DbUpdateException dbEx)
        {
            _logger.LogError(dbEx, "Database error creating payment for MemberId={MemberId}", dto?.MemberId);
            return StatusCode(500, new
            {
                message = "Database error while saving payment.",
                error = dbEx.InnerException?.Message ?? dbEx.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error creating payment");
            return StatusCode(500, new
            {
                message = "Failed to create payment.",
                error = ex.Message
            });
        }
    }
    // GET: api/Inventory/visitors/report
    [HttpGet("visitors/report")]
    public async Task<ActionResult<object>> GetVisitorReport(
     [FromQuery] DateTime? fromDate = null,
     [FromQuery] DateTime? toDate = null,
     [FromQuery] string? period = "daily",
     [FromQuery] int? memberId = null,
     [FromQuery] int? adminMemberId = null,
     [FromQuery] int? subCompanyId = null)
    {
        try
        {
            // ----------------- 1️⃣ Determine date range -----------------
            var today = DateTime.UtcNow.Date; // Use server local time if needed: DateTime.Now.Date
            DateTime startDate, endDate;

            if (fromDate.HasValue || toDate.HasValue)
            {
                startDate = fromDate?.Date ?? today;
                endDate = toDate?.Date ?? today;
            }
            else
            {
                switch (period?.ToLowerInvariant())
                {
                    case "weekly":
                        // Start from Monday
                        startDate = today.AddDays(-(int)today.DayOfWeek + (int)DayOfWeek.Monday);
                        endDate = startDate.AddDays(6);
                        break;
                    case "monthly":
                        startDate = new DateTime(today.Year, today.Month, 1);
                        endDate = startDate.AddMonths(1).AddDays(-1);
                        break;
                    case "yearly":
                        startDate = new DateTime(today.Year, 1, 1);
                        endDate = new DateTime(today.Year, 12, 31);
                        break;
                    case "daily":
                    default:
                        startDate = today;
                        endDate = today;
                        break;
                }
            }

            if (startDate > endDate)
                (startDate, endDate) = (endDate, startDate);

            // ----------------- 2️⃣ Handle adminMemberId -----------------
            int? targetSubCompanyId = subCompanyId;

            if (adminMemberId.HasValue)
            {
                var adminMember = await _context.Members
                    .Where(m => m.Id == adminMemberId.Value && m.IsActive)
                    .Select(m => new { m.Id, m.SubCompanyId })
                    .FirstOrDefaultAsync();

                if (adminMember == null)
                    return NotFound(new { message = $"Active admin member with ID {adminMemberId} not found." });

                if (adminMember.SubCompanyId.HasValue)
                    targetSubCompanyId = adminMember.SubCompanyId;
            }

            // ----------------- 3️⃣ Validate memberId -----------------
            if (memberId.HasValue)
            {
                var member = await _context.Members
                    .Where(m => m.Id == memberId.Value && m.IsActive)
                    .Select(m => new { m.Id, m.SubCompanyId })
                    .FirstOrDefaultAsync();

                if (member == null)
                    return NotFound(new { message = $"Active member with ID {memberId} not found." });

                if (adminMemberId.HasValue && targetSubCompanyId.HasValue &&
                    member.SubCompanyId != targetSubCompanyId.Value)
                {
                    return BadRequest(new { message = "Member does not belong to the admin's sub-company." });
                }
            }

            // ----------------- 4️⃣ Build query -----------------
            var visitorsQuery = _context.Visitors
                .Include(v => v.BroughtByMember)
                .Where(v => v.VisitDate >= startDate && v.VisitDate <= endDate)
                .AsQueryable();

            // Admin + sub-company filter
            if (adminMemberId.HasValue && targetSubCompanyId.HasValue)
            {
                visitorsQuery = visitorsQuery.Where(v =>
                    v.BroughtByMember != null &&
                    v.BroughtByMember.SubCompanyId == targetSubCompanyId.Value);
            }

            // Member filter
            if (memberId.HasValue)
            {
                visitorsQuery = visitorsQuery.Where(v => v.BroughtByMemberId == memberId.Value);
            }

            // ----------------- 5️⃣ Project results -----------------
            var visitors = await visitorsQuery
                .OrderByDescending(v => v.VisitDate)
                .Select(v => new
                {
                    v.Id,
                    v.BroughtByMemberId,
                    BroughtByMemberName = v.BroughtByMember != null ? v.BroughtByMember.Name : "Unknown",
                    v.VisitorName,
                    v.VisitorPhone,
                    v.VisitorEmail,
                    v.VisitorBusiness,
                    v.VisitDate,
                    v.BecameMember,
                    v.MemberId,
                    v.Notes,
                    v.CreatedDate,
                    v.Title,
                    v.FirstName,
                    v.LastName,
                    v.Company,
                    v.Language,
                    v.TelephoneNumber,
                    v.MobileNumber,
                    v.VisitorCountry,
                    v.VisitorAddress,
                    v.VisitorCity,
                    v.VisitorState,
                    v.VisitorPostcode,
                    v.Region,
                    v.Chapter,
                    v.Country,
                    v.Status
                })
                .ToListAsync();

            // ----------------- 6️⃣ Return -----------------
            return Ok(new
            {
                fromDate = startDate,
                toDate = endDate,
                period = period?.ToLowerInvariant(),
                memberId,
                adminMemberId,
                totalRecords = visitors.Count,
                data = visitors
            });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error fetching visitor report");
            return StatusCode(500, new { message = "Error fetching visitor report", error = ex.Message });
        }
    }

    // Helper endpoint for CreatedAtAction
    [HttpGet("payments/{id}")]
    public async Task<ActionResult<Payment>> GetPayment(int id)
    {
        var payment = await _context.Payments.FindAsync(id);
        if (payment == null) return NotFound();
        return payment;
    }
    // GET: api/Reports/attendance
    // GET: api/reports/attendance
    // GET: api/reports/attendance
    // GET: api/inventory/reports/attendance
    // GET: api/inventory/reports/attendance
    [HttpGet("reports/attendance")]
    public async Task<ActionResult<AttendanceReportResponseDto>> GetAttendanceReport(
     [FromQuery] string period = "Daily")
    {
        try
        {
            var todayUtc = DateTime.UtcNow.Date; // e.g., 2026-01-21 00:00:00 UTC

            DateTime start, end;
            var periodLower = period?.Trim().ToLowerInvariant();

            switch (periodLower)
            {
                case "daily":
                    start = DateTime.SpecifyKind(todayUtc, DateTimeKind.Utc);
                    end = DateTime.SpecifyKind(todayUtc.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                    break;

                case "weekly":
                    int diff = (7 + (todayUtc.DayOfWeek - DayOfWeek.Monday)) % 7;
                    var weekStart = todayUtc.AddDays(-diff);
                    start = DateTime.SpecifyKind(weekStart, DateTimeKind.Utc);
                    end = DateTime.SpecifyKind(weekStart.AddDays(7).AddTicks(-1), DateTimeKind.Utc);
                    break;

                case "monthly":
                    start = DateTime.SpecifyKind(new DateTime(todayUtc.Year, todayUtc.Month, 1), DateTimeKind.Utc);
                    end = DateTime.SpecifyKind(start.AddMonths(1).AddTicks(-1), DateTimeKind.Utc);
                    break;

                case "yearly":
                    start = DateTime.SpecifyKind(new DateTime(todayUtc.Year, 1, 1), DateTimeKind.Utc);
                    end = DateTime.SpecifyKind(new DateTime(todayUtc.Year, 12, 31, 23, 59, 59, 999, DateTimeKind.Utc), DateTimeKind.Utc);
                    break;

                default:
                    return BadRequest("Invalid period. Use: Daily, Weekly, Monthly, Yearly");
            }

            // 1️⃣ Get active members
            var members = await _context.Members
                .Where(m => m.IsActive)
                .Select(m => new { m.Id, m.Name, m.Phone, m.Email })
                .ToListAsync();

            if (!members.Any())
                return Ok(new AttendanceReportResponseDto());

            var memberIds = members.Select(m => m.Id).ToList();

            // 2️⃣ Aggregations — all using [start, end] UTC range
            var visitorCounts = await _context.Visitors
                .Where(v => memberIds.Contains(v.BroughtByMemberId) &&
                            v.VisitDate >= start && v.VisitDate <= end)
                .GroupBy(v => v.BroughtByMemberId)
                .ToDictionaryAsync(g => g.Key, g => g.Count());

            var tyfcbGivenCounts = await _context.TYFCB
                .Where(t => memberIds.Contains(t.GivenByMemberId) &&
                            t.VisitDate >= start && t.VisitDate <= end)
                .GroupBy(t => t.GivenByMemberId)
                .ToDictionaryAsync(g => g.Key, g => g.Count());

            var tyfcbReceivedCounts = await _context.TYFCB
                .Where(t => memberIds.Contains(t.ReceivedByMemberId) &&
                            t.VisitDate >= start && t.VisitDate <= end)
                .GroupBy(t => t.ReceivedByMemberId)
                .ToDictionaryAsync(g => g.Key, g => g.Count());

            var referralGivenCounts = await _context.Referrals
                .Where(r => memberIds.Contains(r.GivenByMemberId) &&
                            r.CreatedDate >= start && r.CreatedDate <= end)
                .GroupBy(r => r.GivenByMemberId)
                .ToDictionaryAsync(g => g.Key, g => g.Count());

            var referralReceivedCounts = await _context.Referrals
                .Where(r => memberIds.Contains(r.ReceivedByMemberId) &&
                            r.CreatedDate >= start && r.CreatedDate <= end)
                .GroupBy(r => r.ReceivedByMemberId)
                .ToDictionaryAsync(g => g.Key, g => g.Count());

            var paymentCountDict = await _context.Payments
                .Where(p => memberIds.Contains(p.MemberId) &&
                            p.PaymentStartDate >= start && p.PaymentStartDate <= end)
                .GroupBy(p => p.MemberId)
                .ToDictionaryAsync(g => g.Key, g => g.Count());

            var paymentTotalDict = await _context.Payments
                .Where(p => memberIds.Contains(p.MemberId) &&
                            p.PaymentStartDate >= start && p.PaymentStartDate <= end)
                .GroupBy(p => p.MemberId)
                .ToDictionaryAsync(g => g.Key, g => g.Sum(x => x.Amount));

            var lastVisitDates = await _context.Visitors
                .Where(v => memberIds.Contains(v.BroughtByMemberId) &&
                            v.VisitDate >= start && v.VisitDate <= end)
                .GroupBy(v => v.BroughtByMemberId)
                .ToDictionaryAsync(g => g.Key, g => g.Max(x => x.VisitDate));

            // Helper functions
            int GetCount(Dictionary<int, int> dict, int key) =>
                dict.TryGetValue(key, out var value) ? value : 0;

            decimal GetTotal(Dictionary<int, decimal> dict, int key) =>
                dict.TryGetValue(key, out var value) ? value : 0m;

            DateTime? GetLastVisit(Dictionary<int, DateTime> dict, int key) =>
                dict.TryGetValue(key, out var value) ? value : (DateTime?)null;

            // 3️⃣ Build member list
            var allMembers = members.Select(m => new MemberAttendanceDto
            {
                Id = m.Id,
                Name = m.Name ?? "Unknown",
                Phone = m.Phone ?? "",
                Email = m.Email ?? "",
                VisitorsBrought = GetCount(visitorCounts, m.Id),
                TyfcbGiven = GetCount(tyfcbGivenCounts, m.Id),
                TyfcbReceived = GetCount(tyfcbReceivedCounts, m.Id),
                ReferralsGiven = GetCount(referralGivenCounts, m.Id),
                ReferralsReceived = GetCount(referralReceivedCounts, m.Id),
                PaymentsThisMonth = GetCount(paymentCountDict, m.Id),
                TotalAmountPaidThisMonth = GetTotal(paymentTotalDict, m.Id),
                LastVisitDate = GetLastVisit(lastVisitDates, m.Id)
            }).ToList();

            // 4️⃣ Attendance logic
            var presentMembers = allMembers.Where(m =>
                m.VisitorsBrought > 0 ||
                m.TyfcbGiven > 0 ||
                m.TyfcbReceived > 0 ||
                m.ReferralsGiven > 0 ||
                m.ReferralsReceived > 0).ToList();

            var absentMembers = allMembers.Except(presentMembers).ToList();

            // 5️⃣ Payments summary
            var paidMembers = allMembers.Where(m => m.PaymentsThisMonth > 0).ToList();
            var totalAmountCollected = paidMembers.Sum(m => m.TotalAmountPaidThisMonth);

            // 6️⃣ Final response
            var response = new AttendanceReportResponseDto
            {
                Attendance = new AttendanceSummaryDto
                {
                    Period = CultureInfo.CurrentCulture.TextInfo.ToTitleCase(periodLower),
                    StartDate = start,
                    EndDate = end,
                    TotalMembers = allMembers.Count,
                    PresentCount = presentMembers.Count,
                    AbsentCount = absentMembers.Count,
                    PresentMembers = presentMembers,
                    AbsentMembers = absentMembers
                },
                Members = new MembersSummaryDto
                {
                    AllMembers = allMembers
                },
                Payments = new PaymentSummaryDto
                {
                    TotalPaidMembers = paidMembers.Count,
                    TotalAmountCollected = totalAmountCollected,
                    PaidMembers = paidMembers
                }
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            // Log full exception for debugging
            _logger.LogError(ex, "Attendance report failed for period: {Period}. Error: {ErrorMessage}",
                period, ex.Message);

            return StatusCode(500, new
            {
                message = "Failed to generate attendance report.",
                error = ex.Message
            });
        }
    }

    public class AttendanceReportResponseDto
    {
        public AttendanceSummaryDto Attendance { get; set; } = new();
        public MembersSummaryDto Members { get; set; } = new();
        public PaymentSummaryDto Payments { get; set; } = new();
    }

    public class AttendanceSummaryDto
    {
        public string Period { get; set; } = "Daily";
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int TotalMembers { get; set; }
        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
        public List<MemberAttendanceDto> PresentMembers { get; set; } = new();
        public List<MemberAttendanceDto> AbsentMembers { get; set; } = new();
    }

    public class MembersSummaryDto
    {
        public List<MemberAttendanceDto> AllMembers { get; set; } = new();
    }

    public class PaymentSummaryDto
    {
        public int TotalPaidMembers { get; set; }
        public decimal TotalAmountCollected { get; set; }
        public List<MemberAttendanceDto> PaidMembers { get; set; } = new();
    }
    public class MemberAttendanceDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime? LastVisitDate { get; set; }

        public int VisitorsBrought { get; set; }
        public int TyfcbGiven { get; set; }
        public int TyfcbReceived { get; set; }
        public int ReferralsGiven { get; set; }
        public int ReferralsReceived { get; set; }

        // ✅ Payment details for current calendar month
        public int PaymentsThisMonth { get; set; }
        public decimal TotalAmountPaidThisMonth { get; set; }
    }

    public class AttendanceReportDto
    {
        public string Period { get; set; } = "Daily";
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int TotalMembers { get; set; }
        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
        public List<MemberAttendanceDto> PresentMembers { get; set; } = new();
        public List<MemberAttendanceDto> AbsentMembers { get; set; } = new();
    }
    // DTO for creating payments
    public class CreatePaymentDto
    {
        public int MemberId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentType { get; set; } = string.Empty;
        public string? PaymentMethod { get; set; }
        public string? TransactionId { get; set; }
        public string? PaymentForMonth { get; set; } // e.g., "Jan", "February"
        public DateTime? PaymentDate { get; set; }
        public string? Status { get; set; } // e.g., "Paid", or "1"
        public string? Notes { get; set; }
        public string? CreatedBy { get; set; }
    }
    [HttpGet]
    public async Task<IActionResult> GetPayments([FromQuery] int? memberId)
    {
        try
        {
            var query = _context.Payments
                .Include(p => p.Member)
                .AsQueryable();

            if (memberId.HasValue)
            {
                var memberExists = await _context.Members
                    .AnyAsync(m => m.Id == memberId.Value && m.IsActive);

                if (!memberExists)
                {
                    return NotFound(new { message = $"Member with ID {memberId} not found." });
                }

                query = query.Where(p => p.MemberId == memberId.Value);
            }

            var payments = await query
                .OrderByDescending(p => p.PaymentDate)
                .Select(p => new
                {
                    p.Id,
                    p.MemberId,
                    MemberName = p.Member != null ? p.Member.Name : null,
                    p.Amount,
                    p.PaymentForMonth,
                    p.PaymentDate,
                    p.PaymentMethod,
                    p.Status,
                    p.ReceiptNumber,
                    p.TransactionId
                })
                .ToListAsync();

            return Ok(payments);
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex);
            return StatusCode(500, new { message = "Failed to retrieve payment history." });
        }
    }


    [HttpGet("dashboard-summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetDashboardSummary()
    {
        try
        {
            // Convert current month/year to STRING to match your model
            string currentMonth = DateTime.UtcNow.Month.ToString();      // e.g., "1"
            string currentYear = DateTime.UtcNow.Year.ToString();        // e.g., "2026"

            var totalMembers = await _context.Members.CountAsync(m => m.IsActive);
            var activeMembers = await _context.Members.CountAsync(m => m.IsActive && m.Status == "Active");

            // Compare STRINGS with STRINGS
            var paidMemberIds = await _context.Payments
                .Where(p => p.PaymentForMonth == currentMonth &&
                            (p.Status == "1" ))
                .Select(p => p.MemberId)
                .Distinct()
                .ToListAsync();

            var membersWithPaymentDue = await _context.Members
                .CountAsync(m => m.IsActive && !paidMemberIds.Contains(m.Id));

            return Ok(new DashboardSummaryDto
            {
                TotalMembers = totalMembers,
                ActiveMembers = activeMembers,
                MembersWithPaymentDue = membersWithPaymentDue
            });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error fetching dashboard summary");
            return StatusCode(500, new { message = "Failed to load dashboard data." });
        }
    }
    public class DashboardSummaryDto
    {
        public int TotalMembers { get; set; }
        public int ActiveMembers { get; set; }
        public int MembersWithPaymentDue { get; set; } // Just the count
    }
    // GET: api/Inventory/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Inventory>> GetInventoryItem(int id)
    {
        var item = await _context.Inventory.FindAsync(id);

        if (item == null)
        {
            return NotFound();
        }

        return item;
    }

    // GET: api/Inventory/low-stock
    [HttpGet("low-stock")]
    public async Task<ActionResult<IEnumerable<Inventory>>> GetLowStockItems()
    {
        return await _context.Inventory
            .Where(i => i.IsActive && i.MinimumStock.HasValue && i.Quantity <= i.MinimumStock)
            .ToListAsync();
    }

    // POST: api/Inventory
    [HttpPost]
    public async Task<ActionResult<Inventory>> CreateInventoryItem(Inventory item)
    {
        item.CreatedDate = DateTime.UtcNow;
        _context.Inventory.Add(item);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetInventoryItem), new { id = item.Id }, item);
    }

    // PUT: api/Inventory/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateInventoryItem(int id, Inventory item)
    {
        if (id != item.Id)
        {
            return BadRequest();
        }

        _context.Entry(item).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!InventoryItemExists(id))
            {
                return NotFound();
            }
            throw;
        }

        return NoContent();
    }


    // Create a DTO that matches exactly what your database expects
    public class CreateVisitorDto
    {
        [Required]
        public int BroughtByMemberId { get; set; }

        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;

        // Derived from FirstName + LastName; also accepted directly
        public string? VisitorName { get; set; }

        [Required]
        public string MobileNumber { get; set; } = string.Empty;

        // Alias accepted from frontend
        public string? VisitorPhone { get; set; }

        [EmailAddress]
        public string? VisitorEmail { get; set; }

        public string? VisitorBusiness { get; set; }

        // Alias accepted from frontend
        public string? Company { get; set; }

        public DateTime VisitDate { get; set; }
        public bool? BecameMember { get; set; }
        public string? Notes { get; set; }
    }
    [HttpGet("members-with-payment")]
    public async Task<IActionResult> GetMembersWithPayment(int? memberId = null)
    {
        int currentMonth = DateTime.UtcNow.Month;
        int currentYear = DateTime.UtcNow.Year;

        // Filter members by memberId if provided
        var membersQuery = _context.Members.AsQueryable();
        if (memberId.HasValue && memberId.Value > 0)
        {
            membersQuery = membersQuery.Where(m => m.Id == memberId.Value);
        }

        // Fetch members with current month payment
        var members = await membersQuery
            .Select(m => new
            {
                m.Id,
                m.Name,
                m.Phone,
                m.Email,
                m.JoinDate,
                m.IsActive,
                CurrentPayment = _context.Payments
                    .Where(p => p.MemberId == m.Id &&
                                p.PaymentStartDate.Month == currentMonth &&
                                p.PaymentStartDate.Year == currentYear)
                    .OrderByDescending(p => p.PaymentDate)
                    .Select(p => new { p.Amount, p.Status })
                    .FirstOrDefault()
            })
            .ToListAsync();

        // Prepare response DTOs
        var memberDtos = members.Select(m => new
        {
            m.Id,
            m.Name,
            m.Phone,
            m.Email,
            Joined = m.JoinDate?.ToString("yyyy-MM-dd") ?? "N/A",
            FeesStatus = m.CurrentPayment != null
                         ? (m.CurrentPayment.Status == "1" ? "Paid" : "Pending")
                         : "Unpaid",
            Amount = m.CurrentPayment?.Amount ?? 0,
            IsActive = m.IsActive
        }).ToList();

        // Dashboard counts
        var allMembers = await _context.Members.ToListAsync();
        var totalMembers = allMembers.Count;
        var totalActive = allMembers.Count(m => m.IsActive);
        var totalPending = memberDtos.Count(m => m.FeesStatus == "Pending");
        var totalUnpaid = memberDtos.Count(m => m.FeesStatus == "Unpaid");

        return Ok(new
        {
            TotalMembers = totalMembers,
            ActiveMembers = totalActive,
            PendingPayments = totalPending,
            UnpaidPayments = totalUnpaid,
            Members = memberDtos
        });
    }

    [HttpPost("visitors")]
    [AllowAnonymous]
    public async Task<ActionResult> AddVisitor([FromBody] CreateVisitorDto visitorDto)
    {
        if (visitorDto == null || visitorDto.BroughtByMemberId <= 0)
        {
            return BadRequest(new
            {
                statusCode = 400,
                statusDesc = "Invalid visitor data"
            });
        }

        try
        {
            _logger.LogInformation($"AddVisitor called with BroughtByMemberId: {visitorDto.BroughtByMemberId}");

            // Fetch bringing member to get SubCompanyId
            var broughtByMember = await _context.Members
                .Where(m => m.Id == visitorDto.BroughtByMemberId)
                .Select(m => new { m.Id, m.SubCompanyId })
                .FirstOrDefaultAsync();

            if (broughtByMember == null)
            {
                return BadRequest(new
                {
                    statusCode = 400,
                    statusDesc = $"Member with ID {visitorDto.BroughtByMemberId} not found"
                });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            // Resolve phone and name
            string resolvedPhone = visitorDto.MobileNumber?.Trim()
                                   ?? visitorDto.VisitorPhone?.Trim()
                                   ?? string.Empty;

            string resolvedName = !string.IsNullOrWhiteSpace(visitorDto.VisitorName)
                ? visitorDto.VisitorName.Trim()
                : $"{visitorDto.FirstName} {visitorDto.LastName}".Trim();

            string resolvedBusiness = visitorDto.VisitorBusiness?.Trim()
                                      ?? visitorDto.Company?.Trim()
                                      ?? string.Empty;

            // Create Visitor
            var visitor = new Visitor
            {
                BroughtByMemberId = visitorDto.BroughtByMemberId,
                VisitorName = resolvedName,
                VisitorPhone = resolvedPhone,
                VisitorEmail = visitorDto.VisitorEmail ?? string.Empty,
                VisitorBusiness = resolvedBusiness,
                VisitDate = visitorDto.VisitDate,
                BecameMember = visitorDto.BecameMember ?? false,
                MemberId = visitorDto.BroughtByMemberId,
                Notes = visitorDto.Notes ?? string.Empty,
                FirstName = visitorDto.FirstName,
                LastName = visitorDto.LastName,
                Company = resolvedBusiness,
                MobileNumber = resolvedPhone,
                Status = "1",
                CreatedDate = DateTime.UtcNow,
                SubCompanyId = broughtByMember.SubCompanyId
            };

            _context.Visitors.Add(visitor);
            await _context.SaveChangesAsync();

            if (visitor.BecameMember)
            {
                // ✅ Instead of directly creating Member/User, mark as pending admin approval
                visitor.Status = "PendingMemberApproval";
                visitor.BecameMember = false; // Will be set true only after admin approves
                await _context.SaveChangesAsync();
            }

            await transaction.CommitAsync();

            return Ok(new
            {
                statusCode = 200,
                statusDesc = "Visitor created successfully",
                visitorId = visitor.Id,
                data = visitor
            });
        }
        catch (DbUpdateException dbEx)
        {
            _logger.LogError(dbEx, "Database error in AddVisitor");
            return StatusCode(500, new
            {
                statusCode = 500,
                statusDesc = "Database operation failed",
                error = dbEx.InnerException?.Message ?? dbEx.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in AddVisitor");
            return StatusCode(500, new
            {
                statusCode = 500,
                statusDesc = "An unexpected error occurred",
                error = ex.Message
            });
        }
    }
    [HttpGet("visitors/pending-member-requests/{memberId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPendingMemberRequests(int memberId)
    {
        var pending = await _context.Visitors
            .Where(v => v.BroughtByMemberId == memberId && v.Status == "PendingMemberApproval")
            .Select(v => new {
                v.Id,
                v.VisitorName,
                v.VisitorPhone,
                v.VisitorEmail,
                v.VisitorBusiness,
                v.VisitDate,
                v.Status,
                v.CreatedDate,
                v.BroughtByMemberId
            })
            .ToListAsync();

        return Ok(pending);
    }

    [HttpGet("visitors/all-pending-member-requests")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAllPendingMemberRequests()
    {
        var pending = await _context.Visitors
            .Include(v => v.BroughtByMember)
            .Where(v => v.Status == "PendingMemberApproval")
            .Select(v => new {
                v.Id,
                v.VisitorName,
                v.VisitorPhone,
                v.VisitorEmail,
                v.VisitorBusiness,
                v.VisitDate,
                v.Status,
                v.CreatedDate,
                v.BroughtByMemberId,
                BroughtByMemberName = v.BroughtByMember != null ? v.BroughtByMember.Name : null
            })
            .ToListAsync();

        return Ok(pending);
    }

    [HttpPost("visitors/{id}/approve-member")]
    [AllowAnonymous]
    public async Task<IActionResult> ApproveMemberRequest(int id)
    {
        var visitor = await _context.Visitors.FindAsync(id);
        if (visitor == null) return NotFound();

        if (visitor.Status != "PendingMemberApproval")
            return BadRequest(new { statusDesc = "Visitor is not in pending approval state." });

        var broughtByMember = await _context.Members
            .Where(m => m.Id == visitor.BroughtByMemberId)
            .Select(m => new { m.Id, m.SubCompanyId })
            .FirstOrDefaultAsync();

        if (broughtByMember == null)
            return BadRequest(new { statusDesc = "Referring member not found." });

        if (!string.IsNullOrWhiteSpace(visitor.VisitorEmail))
        {
            bool emailExists = await _context.Users.AnyAsync(u => u.Email == visitor.VisitorEmail)
                                || await _context.Members.AnyAsync(m => m.Email == visitor.VisitorEmail);
            if (emailExists)
                return BadRequest(new { statusDesc = "Email already registered." });
        }

        var now = DateTime.UtcNow;
        string fullName = visitor.VisitorName ?? $"{visitor.FirstName} {visitor.LastName}".Trim();
        string phone = visitor.MobileNumber ?? visitor.VisitorPhone ?? string.Empty;
        string business = visitor.VisitorBusiness ?? visitor.Company ?? string.Empty;

        var newMember = new Member
        {
            Name = fullName,
            Phone = phone,
            Email = visitor.VisitorEmail,
            Password = phone,
            JoinDate = now,
            Status = "Active",
            FeesStatus = "Unpaid",
            Address = string.Empty,
            Business = business,
            ReferenceId = visitor.BroughtByMemberId,
            IsActive = true,
            CreatedBy = visitor.BroughtByMemberId.ToString(),
            CreatedDate = now,
            UpdatedBy = visitor.BroughtByMemberId.ToString(),
            UpdatedDate = now,
            MembershipType = "Monthly",
            ReferralGivenCount = 0,
            ReferralReceivedCount = 0,
            TYFCBGivenCount = 0,
            TYFCBReceivedCount = 0,
            CEUsCount = 0,
            VisitorsCount = 0,
            RevenueReceived = 0,
            SubCompanyId = broughtByMember.SubCompanyId
        };

        _context.Members.Add(newMember);
        await _context.SaveChangesAsync();

        var user = new User
        {
            Username = fullName,
            FullName = fullName,
            Email = visitor.VisitorEmail,
            PasswordHash = phone,
            Role = "User",
            IsActive = true,
            MemberId = newMember.Id,
            CreatedBy = visitor.BroughtByMemberId.ToString(),
            CreatedDate = now,
            UpdatedBy = visitor.BroughtByMemberId.ToString(),
            UpdatedDate = now
        };

        _context.Users.Add(user);

        visitor.Status = "MemberApproved";
        visitor.BecameMember = true;
        visitor.MemberId = newMember.Id;

        await _context.SaveChangesAsync();

        return Ok(new { statusCode = 200, statusDesc = "Visitor approved and added as member.", memberId = newMember.Id });
    }

    [HttpPost("visitors/{id}/reject-member")]
    [AllowAnonymous]
    public async Task<IActionResult> RejectMemberRequest(int id)
    {
        var visitor = await _context.Visitors.FindAsync(id);
        if (visitor == null) return NotFound();

        visitor.Status = "MemberRejected";
        await _context.SaveChangesAsync();

        return Ok(new { statusCode = 200, statusDesc = "Visitor member request rejected." });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Visitor>> GetVisitorById(int id)
    {
        var visitor = await _context.Visitors
            .Include(v => v.BroughtByMember)
            .Include(v => v.ConvertedMember)
            .FirstOrDefaultAsync(v => v.Id == id);

        if (visitor == null)
        {
            return NotFound(new { message = $"Visitor with ID {id} not found" });
        }

        return visitor;
    }


    // DELETE: api/Inventory/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteInventoryItem(int id)
    {
        var item = await _context.Inventory.FindAsync(id);
        if (item == null)
        {
            return NotFound();
        }

        item.IsActive = false;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool InventoryItemExists(int id)
    {
        return _context.Inventory.Any(e => e.Id == id);
    }
}

