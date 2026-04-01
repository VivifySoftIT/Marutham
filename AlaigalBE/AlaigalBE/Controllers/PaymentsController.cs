using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Alaigal.Data;
using Alaigal.Models;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PaymentsController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    public PaymentsController(AlaigalRefContext context)
    {
        _context = context;
    }

    // GET: api/Payments?memberId=4
    [HttpGet]
    public async Task<IActionResult> GetPayments([FromQuery] int? memberId)
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
                return NotFound(new { message = $"Member with ID {memberId} not found" });
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

    // GET: api/Payments/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Payment>> GetPayment(int id)
    {
        var payment = await _context.Payments
            .Include(p => p.Member)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (payment == null)
        {
            return NotFound();
        }

        return payment;
    }

    [HttpGet("member/{memberId}")]
    public async Task<ActionResult<MemberPaymentSummaryDto>> GetMemberPayments(int memberId)
    {
        // 1️⃣ Get member
        var member = await _context.Members
            .FirstOrDefaultAsync(m => m.Id == memberId && m.IsActive);

        if (member == null)
        {
            return NotFound(new { message = "Member not found" });
        }

        // 2️⃣ Get payments
        var payments = await _context.Payments
            .Where(p => p.MemberId == memberId)
            .OrderBy(p => p.PaymentEndDate)
            .ToListAsync();

        if (!payments.Any())
        {
            return Ok(new MemberPaymentSummaryDto
            {
                MemberId = memberId,
                MemberName = member.Name,
                TotalPaidAmount = 0,
                TotalDueAmount = 0
            });
        }

        // 3️⃣ Total paid
        decimal totalPaidAmount = payments.Sum(p => p.Amount);

        // 4️⃣ Last paid payment (December)
        var lastPayment = payments
            .OrderByDescending(p => p.PaymentEndDate)
            .First();

        decimal monthlyFee = lastPayment.Amount; // 🔥 KEY RULE
        DateTime lastPaidEndDate = lastPayment.PaymentEndDate;

        // 5️⃣ Calculate due months
        var dueMonths = new List<DueMonthDto>();
        decimal totalDueAmount = 0;

        var dueMonth = new DateTime(lastPaidEndDate.Year, lastPaidEndDate.Month, 1)
                            .AddMonths(1);

        var currentMonth = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);

        while (dueMonth <= currentMonth)
        {
            dueMonths.Add(new DueMonthDto
            {
                Month = dueMonth.ToString("MMMM yyyy"),
                DueAmount = monthlyFee
            });

            totalDueAmount += monthlyFee;
            dueMonth = dueMonth.AddMonths(1);
        }

        // 6️⃣ Prepare response
        var response = new MemberPaymentSummaryDto
        {
            MemberId = memberId,
            MemberName = member.Name,
            TotalPaidAmount = totalPaidAmount,
            TotalDueAmount = totalDueAmount,

            Payments = payments.Select(p => new MemberPaymentDto
            {
                PaymentForMonth = p.PaymentForMonth,
                Amount = p.Amount,
                PaymentDate = p.PaymentDate,
                PaymentEndDate = p.PaymentEndDate,
                ReceiptNo = p.ReceiptNumber,
                TransactionId = p.TransactionId
            }).ToList(),

            DueMonths = dueMonths
        };

        return Ok(response);
    }

    public class MemberPaymentSummaryDto
    {
        public int MemberId { get; set; }
        public string MemberName { get; set; } = string.Empty;

        public decimal TotalPaidAmount { get; set; }
        public decimal TotalDueAmount { get; set; }

        public List<MemberPaymentDto> Payments { get; set; } = new();
        public List<DueMonthDto> DueMonths { get; set; } = new();
    }

    public class MemberPaymentDto
    {
        public string PaymentForMonth { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime? PaymentDate { get; set; }
        public DateTime PaymentEndDate { get; set; }
        public string? ReceiptNo { get; set; } = string.Empty;
        public string? TransactionId { get; set; }
    }

    public class DueMonthDto
    {
        public string Month { get; set; } = string.Empty;
        public decimal DueAmount { get; set; }
    }

    // GET: api/Payments/report
    [HttpGet("report")]
    public async Task<ActionResult<object>> GetPaymentReport(
      [FromQuery] DateTime? fromDate = null,
      [FromQuery] DateTime? toDate = null,
      [FromQuery] string? period = "daily",
      [FromQuery] int? memberId = null,
      [FromQuery] int? adminMemberId = null)
    {
        try
        {
            var now = DateTime.UtcNow.Date;
            DateTime startDate, endDate;

            // Determine date range
            if (fromDate.HasValue || toDate.HasValue)
            {
                startDate = fromDate?.Date ?? now;
                endDate = toDate?.Date ?? now;
            }
            else
            {
                switch (period?.ToLowerInvariant())
                {
                    case "weekly":
                        var startOfWeek = now.AddDays(-(int)now.DayOfWeek + (int)DayOfWeek.Monday);
                        startDate = startOfWeek;
                        endDate = startOfWeek.AddDays(6);
                        break;
                    case "monthly":
                        startDate = new DateTime(now.Year, now.Month, 1);
                        endDate = startDate.AddMonths(1).AddDays(-1);
                        break;
                    case "yearly":
                        startDate = new DateTime(now.Year, 1, 1);
                        endDate = new DateTime(now.Year, 12, 31);
                        break;
                    case "daily":
                    default:
                        startDate = now;
                        endDate = now;
                        break;
                }
            }

            if (startDate > endDate)
                (startDate, endDate) = (endDate, startDate);

            // 🔑 Step 1: Handle adminMemberId — get SubCompanyId
            int? targetSubCompanyId = null;
            if (adminMemberId.HasValue)
            {
                var adminMember = await _context.Members
                    .FirstOrDefaultAsync(m => m.Id == adminMemberId.Value && m.IsActive);

                if (adminMember == null)
                    return NotFound(new { message = $"Active admin member with ID {adminMemberId} not found." });

                targetSubCompanyId = adminMember.SubCompanyId;
                if (!targetSubCompanyId.HasValue)
                    return BadRequest(new { message = "Admin member is not associated with any sub-company." });
            }

            // 🔑 Step 2: Handle memberId — validate and check sub-company if admin is present
            if (memberId.HasValue)
            {
                var member = await _context.Members
                    .FirstOrDefaultAsync(m => m.Id == memberId.Value && m.IsActive);

                if (member == null)
                    return NotFound(new { message = $"Active member with ID {memberId} not found." });

                // 🔒 If admin is specified, ensure member belongs to same SubCompany
                if (adminMemberId.HasValue)
                {
                    if (member.SubCompanyId != targetSubCompanyId)
                    {
                        return BadRequest(new { message = "Member does not belong to the admin's sub-company." });
                    }
                }
            }

            // Build base query
            var query = _context.Payments
                .Include(p => p.Member)
                .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate);

            // 🔑 Apply filters
            if (adminMemberId.HasValue && memberId.HasValue)
            {
                // Admin + specific member in same company
                query = query.Where(p =>
                    p.MemberId == memberId.Value &&
                    p.SubCompanyId == targetSubCompanyId.Value);
            }
            else if (adminMemberId.HasValue)
            {
                // Admin view: all payments in company
                query = query.Where(p => p.SubCompanyId == targetSubCompanyId.Value);
            }
            else if (memberId.HasValue)
            {
                // Member view: no company restriction
                query = query.Where(p => p.MemberId == memberId.Value);
            }
            // else: global view

            // Execute query
            var paymentsFromDb = await query
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();

            // Project in memory
            var payments = paymentsFromDb.Select(p => new
            {
                p.Id,
                p.MemberId,
                MemberName = p.Member?.Name ?? "Unknown",
                p.Amount,
                p.PaymentMethod,
                p.TransactionId,
                p.PaymentForMonth,
                p.PaymentStartDate,
                p.PaymentEndDate,
                p.PaymentDate,
                p.Status,
                p.ReceiptNumber,
                p.Notes,
                SubCompanyId = p.SubCompanyId ?? p.Member?.SubCompanyId,
                p.CreatedDate,
                p.UpdatedDate
            }).ToList();

            return Ok(new
            {
                fromDate = startDate,
                toDate = endDate,
                period = period?.ToLowerInvariant(),
                memberId = memberId,
                adminMemberId = adminMemberId,
                totalRecords = payments.Count,
                totalAmount = payments.Sum(p => p.Amount),
                data = payments
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching payment report", error = ex.Message });
        }
    }

    // POST: api/Payments
    // Update your POST method in PaymentsController.cs
  

    // PUT: api/Payments/5

}
