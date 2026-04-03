using Microsoft.AspNetCore.Authorization;
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

    // GET: api/Payments?memberId=4&subCompanyId=2
    [HttpGet]
    public async Task<IActionResult> GetPayments([FromQuery] int? memberId, [FromQuery] int? subCompanyId)
    {
        var query = _context.Payments
            .Include(p => p.Member)
            .AsQueryable();

        if (memberId.HasValue)
        {
            var memberExists = await _context.Members
                .AnyAsync(m => m.Id == memberId.Value && m.IsActive);

            if (!memberExists)
                return NotFound(new { message = $"Member with ID {memberId} not found" });

            query = query.Where(p => p.MemberId == memberId.Value);
        }

        // Filter by subCompanyId — via payment's own SubCompanyId or member's SubCompanyId
        if (subCompanyId.HasValue)
        {
            query = query.Where(p =>
                p.SubCompanyId == subCompanyId.Value ||
                (p.SubCompanyId == null && p.Member != null && p.Member.SubCompanyId == subCompanyId.Value));
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
        // 1️⃣ Get member with sub-company
        var member = await _context.Members
            .Include(m => m.SubCompany)
            .FirstOrDefaultAsync(m => m.Id == memberId && m.IsActive);

        if (member == null)
            return NotFound(new { message = "Member not found" });

        // 2️⃣ Get configured monthly fee from sub-company, fallback to last payment amount
        decimal configuredFee = 0;
        if (member.SubCompany?.MonthlyFee.HasValue == true && member.SubCompany.MonthlyFee.Value > 0)
            configuredFee = member.SubCompany.MonthlyFee.Value;

        // 3️⃣ Get all payments ordered by date
        var payments = await _context.Payments
            .Where(p => p.MemberId == memberId)
            .OrderBy(p => p.PaymentEndDate)
            .ToListAsync();

        decimal totalPaidAmount = payments.Sum(p => p.Amount);

        // If no fee configured and no payments, return empty
        if (configuredFee == 0 && !payments.Any())
        {
            return Ok(new MemberPaymentSummaryDto
            {
                MemberId = memberId,
                MemberName = member.Name,
                MonthlyFee = 0,
                TotalPaidAmount = 0,
                TotalDueAmount = 0
            });
        }

        // Use last payment amount as fallback fee if not configured
        if (configuredFee == 0 && payments.Any())
            configuredFee = payments.OrderByDescending(p => p.PaymentEndDate).First().Amount;

        // 4️⃣ Determine start month — member join date or first payment, whichever is earlier
        var now = DateTime.Now;
        var currentMonth = new DateTime(now.Year, now.Month, 1);

        DateTime startMonth;
        if (member.JoinDate.HasValue)
            startMonth = new DateTime(member.JoinDate.Value.Year, member.JoinDate.Value.Month, 1);
        else if (payments.Any())
            startMonth = new DateTime(payments.First().PaymentEndDate.Year, payments.First().PaymentEndDate.Month, 1);
        else
        {
            // No join date, no payments — nothing owed
            return Ok(new MemberPaymentSummaryDto
            {
                MemberId = memberId,
                MemberName = member.Name,
                MonthlyFee = configuredFee,
                TotalPaidAmount = 0,
                TotalDueAmount = 0,
                CreditBalance = 0
            });
        }

        // 5️⃣ Calculate total months owed from start to current month (inclusive)
        int totalMonthsOwed = ((currentMonth.Year - startMonth.Year) * 12) + (currentMonth.Month - startMonth.Month) + 1;
        decimal totalOwed = totalMonthsOwed * configuredFee;

        // 6️⃣ Credit balance = total paid - total owed
        decimal creditBalance = totalPaidAmount - totalOwed;

        var dueMonths = new List<DueMonthDto>();
        decimal totalDueAmount = 0;

        if (creditBalance >= 0)
        {
            // Advance paid — calculate how many future months are covered
            int advanceMonthsCovered = configuredFee > 0 ? (int)(creditBalance / configuredFee) : 0;
            // No due months, show credit info
            totalDueAmount = 0;
        }
        else
        {
            // Calculate which months are unpaid
            // Find the last month covered by payments
            decimal runningBalance = totalPaidAmount;
            var checkMonth = startMonth;

            while (checkMonth <= currentMonth)
            {
                runningBalance -= configuredFee;
                if (runningBalance < 0)
                {
                    dueMonths.Add(new DueMonthDto
                    {
                        Month = checkMonth.ToString("MMMM yyyy"),
                        DueAmount = configuredFee
                    });
                    totalDueAmount += configuredFee;
                }
                checkMonth = checkMonth.AddMonths(1);
            }
        }

        // 7️⃣ Prepare response
        var response = new MemberPaymentSummaryDto
        {
            MemberId = memberId,
            MemberName = member.Name,
            MonthlyFee = configuredFee,
            TotalPaidAmount = totalPaidAmount,
            TotalDueAmount = totalDueAmount,
            CreditBalance = creditBalance > 0 ? creditBalance : 0,
            Payments = payments.Select(p => new MemberPaymentDto
            {
                PaymentId = p.Id,
                PaymentForMonth = p.PaymentForMonth,
                Amount = p.Amount,
                PaymentDate = p.PaymentDate,
                PaymentEndDate = p.PaymentEndDate,
                ReceiptNo = p.ReceiptNumber,
                TransactionId = p.TransactionId,
                PaymentMethod = p.PaymentMethod,
                Status = p.Status,
            }).ToList(),
            DueMonths = dueMonths
        };

        return Ok(response);
    }

    // GET: api/Payments/all-members-summary?subCompanyId=2
    [HttpGet("all-members-summary")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public async Task<IActionResult> GetAllMembersSummary([FromQuery] int? subCompanyId = null)
    {
        var now = DateTime.Now;
        var currentMonth = new DateTime(now.Year, now.Month, 1);

        // Get sub-company fee
        decimal configuredFee = 0;
        if (subCompanyId.HasValue)
        {
            var sc = await _context.SubCompanies.FindAsync(subCompanyId.Value);
            if (sc?.MonthlyFee.HasValue == true) configuredFee = sc.MonthlyFee.Value;
        }

        // Get all active members in sub-company
        var membersQuery = _context.Members.Where(m => m.IsActive);
        if (subCompanyId.HasValue)
            membersQuery = membersQuery.Where(m => m.SubCompanyId == subCompanyId.Value);

        var members = await membersQuery
            .OrderBy(m => m.Name)
            .Select(m => new { m.Id, m.Name, m.JoinDate, m.SubCompanyId })
            .ToListAsync();

        // Get all payments for these members in one query
        var memberIds = members.Select(m => m.Id).ToList();
        var allPayments = await _context.Payments
            .Where(p => memberIds.Contains(p.MemberId))
            .ToListAsync();

        var result = new List<object>();

        foreach (var member in members)
        {
            var payments = allPayments.Where(p => p.MemberId == member.Id).OrderBy(p => p.PaymentEndDate).ToList();
            decimal totalPaid = payments.Sum(p => p.Amount);

            decimal fee = configuredFee > 0 ? configuredFee
                        : (payments.Any() ? payments.OrderByDescending(p => p.PaymentEndDate).First().Amount : 0);

            // Start month from join date — skip if no join date and no payments
            DateTime startMonth;
            if (member.JoinDate.HasValue)
                startMonth = new DateTime(member.JoinDate.Value.Year, member.JoinDate.Value.Month, 1);
            else if (payments.Any())
                startMonth = new DateTime(payments.First().PaymentEndDate.Year, payments.First().PaymentEndDate.Month, 1);
            else
            {
                // No join date, no payments — nothing owed
                result.Add(new
                {
                    memberId = member.Id,
                    memberName = member.Name,
                    monthlyFee = fee,
                    totalPaidAmount = totalPaid,
                    totalDueAmount = (decimal)0,
                    creditBalance = (decimal)0,
                    dueMonths = new List<object>(),
                    paymentCount = payments.Count,
                    payments = payments.Select(p => new
                    {
                        paymentId = p.Id,
                        paymentForMonth = p.PaymentForMonth,
                        amount = p.Amount,
                        paymentDate = p.PaymentDate,
                        receiptNo = p.ReceiptNumber,
                        paymentMethod = p.PaymentMethod,
                        status = p.Status,
                    }).ToList()
                });
                continue;
            }

            int totalMonthsOwed = ((currentMonth.Year - startMonth.Year) * 12) + (currentMonth.Month - startMonth.Month) + 1;
            decimal totalOwed = totalMonthsOwed * fee;
            decimal creditBalance = totalPaid - totalOwed;

            var dueMonths = new List<object>();
            decimal totalDueAmount = 0;

            if (creditBalance < 0 && fee > 0)
            {
                decimal runningBalance = totalPaid;
                var checkMonth = startMonth;
                while (checkMonth <= currentMonth)
                {
                    runningBalance -= fee;
                    if (runningBalance < 0)
                    {
                        dueMonths.Add(new { month = checkMonth.ToString("MMMM yyyy"), dueAmount = fee });
                        totalDueAmount += fee;
                    }
                    checkMonth = checkMonth.AddMonths(1);
                }
            }

            result.Add(new
            {
                memberId = member.Id,
                memberName = member.Name,
                monthlyFee = fee,
                totalPaidAmount = totalPaid,
                totalDueAmount,
                creditBalance = creditBalance > 0 ? creditBalance : 0,
                dueMonths,
                paymentCount = payments.Count,
                payments = payments.Select(p => new
                {
                    paymentId = p.Id,
                    paymentForMonth = p.PaymentForMonth,
                    amount = p.Amount,
                    paymentDate = p.PaymentDate,
                    receiptNo = p.ReceiptNumber,
                    paymentMethod = p.PaymentMethod,
                    status = p.Status,
                }).ToList()
            });
        }

        return Ok(result);
    }

    public class MemberPaymentSummaryDto
    {
        public int MemberId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public decimal MonthlyFee { get; set; }
        public decimal TotalPaidAmount { get; set; }
        public decimal TotalDueAmount { get; set; }
        public decimal CreditBalance { get; set; }
        public List<MemberPaymentDto> Payments { get; set; } = new();
        public List<DueMonthDto> DueMonths { get; set; } = new();
    }

    public class MemberPaymentDto
    {
        public int PaymentId { get; set; }
        public string PaymentForMonth { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime? PaymentDate { get; set; }
        public DateTime PaymentEndDate { get; set; }
        public string? ReceiptNo { get; set; } = string.Empty;
        public string? TransactionId { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Status { get; set; }
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
      [FromQuery] int? adminMemberId = null,
      [FromQuery] int? subCompanyId = null)
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
            int? targetSubCompanyId = subCompanyId;
            if (adminMemberId.HasValue)
            {
                var adminMember = await _context.Members
                    .FirstOrDefaultAsync(m => m.Id == adminMemberId.Value && m.IsActive);

                if (adminMember == null)
                    return NotFound(new { message = $"Active admin member with ID {adminMemberId} not found." });

                if (adminMember.SubCompanyId.HasValue)
                    targetSubCompanyId = adminMember.SubCompanyId;
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
  

    // POST: api/Payments/5/confirm
    [HttpPost("{id}/confirm")]
    [AllowAnonymous]
    public async Task<IActionResult> ConfirmPayment(int id)
    {
        var payment = await _context.Payments.FindAsync(id);
        if (payment == null) return NotFound(new { message = $"Payment with ID {id} not found" });

        payment.Status = "AdminConfirmed";
        payment.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Payment confirmed successfully", paymentId = id });
    }

    // PUT: api/Payments/5

}

