using System.Globalization;
using Alaigal.Data;
using Alaigal.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class NoticesController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    public NoticesController(AlaigalRefContext context)
    {
        _context = context;
    }

    // GET: api/Notices
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Notice>>> GetNotices()
    {
        return await _context.Notices
            .Where(n => n.IsActive)
            .OrderByDescending(n => n.CreatedDate)
            .ToListAsync();
    }

    // GET: api/Notices/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Notice>> GetNotice(int id)
    {
        var notice = await _context.Notices.FindAsync(id);

        if (notice == null)
        {
            return NotFound();
        }

        return notice;
    }
    [HttpGet("dashboard-reminders")]
    public async Task<ActionResult> GetDashboardReminders([FromQuery] int memberId)
    {
        var currentMember = await _context.Members
            .FirstOrDefaultAsync(m => m.Id == memberId && m.IsActive);

        if (currentMember == null)
            return NotFound(new { message = "Member not found." });

        if (!currentMember.SubCompanyId.HasValue)
            return Ok(new
            {
                teamBirthdays = new List<object>(),
                upcomingMeetings = new List<object>(),
                paymentReminder = (object?)null,
                recentNotifications = new List<object>()
            });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var subCompanyId = currentMember.SubCompanyId.Value;
        var now = DateTime.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        // === 1. TEAM BIRTHDAYS — ONLY NEXT 6 DAYS (INCLUDING TODAY) ===
        var teamMembersWithDob = await _context.Members
            .Where(m => m.IsActive
                        && m.SubCompanyId == subCompanyId
                        && m.Id != memberId
                        && m.DOB.HasValue)
            .Select(m => new { m.Name, m.DOB })
            .ToListAsync();

        var birthdays = teamMembersWithDob
            .Select(m =>
            {
                var dob = m.DOB.Value;
                var thisYearDob = new DateTime(today.Year, dob.Month, dob.Day);
                // If birthday already passed this year, use next year
                if (thisYearDob.Date < now.Date)
                    thisYearDob = thisYearDob.AddYears(1);

                var daysUntil = (thisYearDob.Date - now.Date).Days;
                return new
                {
                    Name = m.Name,
                    Birthday = thisYearDob.ToString("yyyy-MM-dd"),
                    DaysUntil = daysUntil,
                    IsToday = daysUntil == 0
                };
            })
            .Where(x => x.DaysUntil >= 0 && x.DaysUntil <= 6) // 👈 ONLY next 6 days
            .OrderBy(x => x.DaysUntil)
            .Cast<object>()
            .ToList();

        // === 2. UPCOMING MEETINGS (next 4 days) ===
        var meetingEnd = today.AddDays(4);
        var rawMeetings = await _context.MeetingDetails
            .Where(m => m.IsActive
                        && m.SubCompanyId == subCompanyId
                        && m.MeetingDate >= today
                        && m.MeetingDate <= meetingEnd)
            .OrderBy(m => m.MeetingDate)
            .ToListAsync();

        var meetings = rawMeetings.Select(m => new
        {
            m.Id,
            m.MeetingTitle,
            m.Description,
            MeetingDate = m.MeetingDate.ToString("yyyy-MM-dd"),
            Time = m.Time.ToString("hh\\:mm tt"),
            m.Place,
            m.MeetingType,
            m.MeetingLink,
            m.ContactPersonName,
            DaysUntil = m.MeetingDate.DayNumber - today.DayNumber,
            IsToday = m.MeetingDate == today
        }).ToList();

        // === 3. PAYMENT REMINDER ===
        object? paymentReminder = null;

        DateTime GetPaymentDateTime(Payment p) => p.PaymentDate ?? p.CreatedDate;

        var allPaidPayments = await _context.Payments
            .Where(p => p.MemberId == memberId && p.Status == "Paid")
            .ToListAsync();

        bool hasCurrentPaid = allPaidPayments.Any(p =>
        {
            var pd = GetPaymentDateTime(p);
            return pd.Month == currentMonth && pd.Year == currentYear;
        });

        if (!hasCurrentPaid)
        {
            var lastPaid = allPaidPayments
                .OrderByDescending(p => GetPaymentDateTime(p))
                .FirstOrDefault();

            string monthName = DateTimeFormatInfo.CurrentInfo.GetMonthName(currentMonth);

            paymentReminder = new
            {
                IsPending = true,
                Message = $"Payment for {monthName} {currentYear} is pending!",
                Month = currentMonth,
                Year = currentYear,
                ExpectedAmount = lastPaid?.Amount ?? 1000m,
                ReferencePaymentId = lastPaid?.Id,
                DueDate = new DateTime(currentYear, currentMonth, 1).AddMonths(1).AddDays(-1).ToString("yyyy-MM-dd")
            };
        }

        // === 4. RECENT NOTIFICATIONS (Payment, Event, Welcome) ===
        var validTypes = new[] { "Payment", "Event", "Welcome" };

        var allNotifications = await _context.MessageNotifications
            .Where(n => n.SubCompanyId == subCompanyId
                        && validTypes.Contains(n.MessageType)
                        && n.IsSent == true)
            .OrderByDescending(n => n.SentDate ?? n.CreatedDate)
            .Take(10)
            .ToListAsync();

        var filteredNotifications = allNotifications
            .Where(n =>
            {
                // Broadcast to all if MemberIds is empty/null
                if (string.IsNullOrWhiteSpace(n.MemberIds))
                    return true;

                // Otherwise, check if current memberId is in the list
                var ids = n.MemberIds.Split(',')
                                     .Select(s => s.Trim())
                                     .Where(s => !string.IsNullOrEmpty(s));

                return ids.Any(idStr => int.TryParse(idStr, out int id) && id == memberId);
            })
            .Select(n => new
            {
                n.Id,
                Type = n.MessageType,
                n.Subject,
                n.Content,
                AttachmentUrl = n.AttachmentUrl,
                SentDate = (n.SentDate ?? n.CreatedDate).ToString("yyyy-MM-dd HH:mm")
            })
            .ToList();

        // === FINAL RESPONSE ===
        return Ok(new
        {
            forMemberId = memberId,
            subCompanyId = subCompanyId,
            teamBirthdays = birthdays,
            upcomingMeetings = meetings,
            paymentReminder = paymentReminder,
            recentNotifications = filteredNotifications
        });
    }
    // POST: api/Notices
    [HttpPost]
    public async Task<ActionResult<Notice>> CreateNotice(Notice notice)
    {
        notice.CreatedDate = DateTime.UtcNow;
        _context.Notices.Add(notice);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetNotice), new { id = notice.Id }, notice);
    }

    // POST: api/Notices/5/send
    [HttpPost("{id}/send")]
    public async Task<IActionResult> SendNotice(int id)
    {
        var notice = await _context.Notices.FindAsync(id);
        if (notice == null)
        {
            return NotFound();
        }

        notice.IsSent = true;
        notice.SentDate = DateTime.UtcNow;
        notice.UpdatedDate = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();

        return Ok(new { message = "Notice sent successfully" });
    }

    // PUT: api/Notices/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateNotice(int id, Notice notice)
    {
        if (id != notice.Id)
        {
            return BadRequest();
        }

        notice.UpdatedDate = DateTime.UtcNow;
        _context.Entry(notice).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!NoticeExists(id))
            {
                return NotFound();
            }
            throw;
        }

        return NoContent();
    }

    // DELETE: api/Notices/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotice(int id)
    {
        var notice = await _context.Notices.FindAsync(id);
        if (notice == null)
        {
            return NotFound();
        }

        notice.IsActive = false;
        notice.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool NoticeExists(int id)
    {
        return _context.Notices.Any(e => e.Id == id);
    }
}
