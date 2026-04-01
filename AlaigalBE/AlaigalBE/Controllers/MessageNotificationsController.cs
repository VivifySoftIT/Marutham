// Controllers/MessageNotificationsController.cs
using System.ComponentModel.DataAnnotations;
using Alaigal.Data;
using Alaigal.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class MessageNotificationsController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    public MessageNotificationsController(AlaigalRefContext context)
    {
        _context = context;
    }

    // GET: api/MessageNotifications
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MessageNotification>>> GetMessageNotifications()
    {
        return await _context.MessageNotifications
            .Include(m => m.CreatedByMember)
            .OrderByDescending(m => m.CreatedDate)
            .ToListAsync();
    }

    // GET: api/MessageNotifications/5
    [HttpGet("{id}")]
    public async Task<ActionResult<MessageNotification>> GetMessageNotification(int id)
    {
        var notification = await _context.MessageNotifications
            .Include(m => m.CreatedByMember)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (notification == null)
        {
            return NotFound();
        }

        return notification;
    }

    [HttpPost]
    public async Task<ActionResult<MessageNotification>> CreateMessageNotification([FromBody] CreateMessageNotificationDto dto)
    {
        try
        {
            if (dto == null)
                return BadRequest("Message data is required.");

            var validTypes = new[] { "Birthday", "Payment", "Event", "Meeting", "Welcome" };
            if (!validTypes.Contains(dto.MessageType))
                return BadRequest($"Invalid MessageType. Valid values: {string.Join(", ", validTypes)}");

            // Validate CreatedBy (creator must be a valid active member)
            if (!dto.CreatedBy.HasValue)
                return BadRequest("CreatedBy is required.");

            var creator = await _context.Members
                .FirstOrDefaultAsync(m => m.Id == dto.CreatedBy.Value && m.IsActive);

            if (creator == null)
                return BadRequest("Invalid CreatedBy member ID.");

            int? targetSubCompanyId = null;
            List<int> validMemberIds = new();

            // 🔑 Process MemberIds: validate or auto-populate
            if (!string.IsNullOrWhiteSpace(dto.MemberIds))
            {
                var ids = dto.MemberIds.Split(',')
                    .Select(s => s.Trim())
                    .Where(s => !string.IsNullOrEmpty(s))
                    .ToList();

                foreach (var idStr in ids)
                {
                    if (!int.TryParse(idStr, out int memberId))
                        return BadRequest($"Invalid Member ID: {idStr}");

                    var member = await _context.Members
                        .FirstOrDefaultAsync(m => m.Id == memberId && m.IsActive);

                    if (member == null)
                        return BadRequest($"Member ID {memberId} not found or inactive.");

                    // Set SubCompanyId from first member
                    if (targetSubCompanyId == null)
                    {
                        targetSubCompanyId = member.SubCompanyId;
                    }
                    else if (member.SubCompanyId != targetSubCompanyId)
                    {
                        return BadRequest($"Member ID {memberId} belongs to a different sub-company than others.");
                    }

                    validMemberIds.Add(memberId);
                }
            }
            else
            {
                // 👈 Auto-populate MemberIds for Event, Welcome, Meeting
                if (new[] { "Event", "Welcome", "Meeting" }.Contains(dto.MessageType))
                {
                    var allActiveMembers = await _context.Members
                        .Where(m => m.SubCompanyId == creator.SubCompanyId && m.IsActive)
                        .Select(m => m.Id)
                        .ToListAsync();

                    validMemberIds = allActiveMembers;
                    dto.MemberIds = string.Join(",", allActiveMembers); // Ensure MemberIds is set for storage
                }
                // For Birthday/Payment, leave MemberIds as null/empty if not provided

                targetSubCompanyId = creator.SubCompanyId;
            }

            var notification = new MessageNotification
            {
                MessageType = dto.MessageType,
                MemberIds = dto.MemberIds?.Trim(), // Now populated for auto-fill cases
                Subject = dto.Subject?.Trim() ?? string.Empty,
                Date = dto.Date, // 👈 STORE THE DATE HERE

                Content = dto.Content?.Trim() ?? string.Empty,
                AttachmentUrl = dto.AttachmentUrl?.Trim(),
                CreatedBy = dto.CreatedBy.Value,
                CreatedDate = DateTime.UtcNow,
                SubCompanyId = targetSubCompanyId
            };

            _context.MessageNotifications.Add(notification);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetMessageNotification", new { id = notification.Id }, notification);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating message notification", error = ex.Message });
        }
    }
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMessageNotification(int id, [FromBody] UpdateMessageNotificationDto dto)
    {
        var notification = await _context.MessageNotifications.FindAsync(id);
        if (notification == null)
        {
            return NotFound();
        }

        notification.Subject = dto.Subject?.Trim() ?? notification.Subject;
        notification.Content = dto.Content?.Trim() ?? notification.Content;
        notification.AttachmentUrl = dto.AttachmentUrl?.Trim() ?? notification.AttachmentUrl;
        notification.UpdatedBy = dto.UpdatedBy;
        notification.UpdatedDate = DateTime.UtcNow;

        _context.Entry(notification).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }
    [HttpGet("birthday-wish/{memberId}")]
    public async Task<ActionResult<object>> GetTodaysBirthdayWish(int memberId, [FromQuery] int? status = null)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var now = DateTime.UtcNow;
            const int SYSTEM_USER_ID = 0; // Reserved ID for system-generated records (int audit fields)

            // ✅ STEP 1: Handle meeting status and attendance if status is provided
            if (status.HasValue && (status == 1 || status == 2))
            {
                // --- Update or create DailyMeetingStatus (uses INT for CrtBy/UpdateBy) ---
                var meetingStatus = await _context.DailyMeetingStatuses
                    .FirstOrDefaultAsync(d => d.MemberId == memberId && d.MeetingDate == today);

                if (meetingStatus != null)
                {
                    meetingStatus.Status = status.Value;
                    meetingStatus.UpdateDate = now;
                }
                else
                {
                    meetingStatus = new DailyMeetingStatus
                    {
                        MemberId = memberId,
                        MeetingDate = today,
                        Status = status.Value,
                        Sentdate = status == 2 ? now : null,
                        CrtDate = now,
                        UpdateDate = now,
                    };
                    _context.DailyMeetingStatuses.Add(meetingStatus);
                }

                // --- If status == 1, ensure Attendance record exists (uses STRING for CreatedBy/UpdatedBy) ---
                if (status == 1)
                {
                    bool attendanceExists = await _context.Attendance
                        .AnyAsync(a => a.MemberId == memberId && a.AttendanceDate == today);

                    if (!attendanceExists)
                    {
                        var member = await _context.Members
                            .Where(m => m.Id == memberId && m.IsActive)
                            .Select(m => new { m.SubCompanyId })
                            .FirstOrDefaultAsync();

                        if (member == null || !member.SubCompanyId.HasValue)
                        {
                            return BadRequest(new
                            {
                                message = "Member not found, inactive, or missing SubCompanyId. Cannot create attendance."
                            });
                        }

                        var attendance = new Attendance
                        {
                            MemberId = memberId,
                            AttendanceDate = today,
                            CheckInTime = now.TimeOfDay,
                            CheckOutTime = null,
                            Status = "Present",
                            Notes = "Attendance recorded based on meeting confirmation",
                            Batch = null,
                            IsActive = true,

                            // ✅ STRING audit fields (as per your design)
                            CreatedBy = "System",
                            CreatedDate = now,
                            UpdatedBy = "System",
                            UpdatedDate = now,

                            SubCompanyId = member.SubCompanyId.Value
                        };

                        _context.Attendance.Add(attendance);
                    }
                }

                // ✅ SINGLE SaveChanges call for both entities
                await _context.SaveChangesAsync();
            }

            // ✅ STEP 2: Fetch today's birthday wish (safe for nullable SentDate)
            var startOfToday = today;
            var startOfTomorrow = today.AddDays(1);

            var result = await _context.BirthdayWishLogs
                .Where(b => b.MemberId == memberId &&
                            b.SentDate >= startOfToday &&
                            b.SentDate < startOfTomorrow)
                .Select(b => new
                {
                    b.Id,
                    ReceiverId = b.MemberId,
                    b.SentById,
                    SenderName = _context.Members
                        .Where(m => m.Id == b.SentById)
                        .Select(m => m.Name)
                        .FirstOrDefault() ?? "Unknown",
                    b.SentDate
                })
                .FirstOrDefaultAsync();

            // ✅ Always return 200 OK
            return Ok(new
            {
                birthdayWish = result,
                message = result == null ? "No birthday wish found for today." : (string?)null,
                attendanceMarked = status == 1,
                meetingStatusUpdated = status.HasValue
            });
        }
        catch (Exception ex)
        {
            // Log full exception in real app (you removed _logger, so use Console)
            Console.WriteLine($"💥 Unexpected error in GetTodaysBirthdayWish: {ex}");
            return StatusCode(500, new { message = "Server error", error = ex.Message });
        }
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMessageNotification(int id)
    {
        var notification = await _context.MessageNotifications.FindAsync(id);
        if (notification == null)
        {
            return NotFound();
        }

        _context.MessageNotifications.Remove(notification);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/MessageNotifications/report
    [HttpGet("report")]
    public async Task<ActionResult<object>> GetMessageNotificationReport(
     [FromQuery] string? type = null,
     [FromQuery] string? period = "daily",
     [FromQuery] int? adminMemberId = null)
    {
        try
        {
            var now = DateTime.UtcNow;
            var today = now.Date;

            DateTime startDate, endDate;

            // Determine date range
            if (period?.ToLowerInvariant() == "weekly")
            {
                var startOfWeek = today.AddDays(-(int)today.DayOfWeek + (int)DayOfWeek.Monday);
                startDate = startOfWeek;
                endDate = startOfWeek.AddDays(6);
            }
            else if (period?.ToLowerInvariant() == "monthly")
            {
                startDate = new DateTime(today.Year, today.Month, 1);
                endDate = startDate.AddMonths(1).AddDays(-1);
            }
            else if (period?.ToLowerInvariant() == "yearly")
            {
                startDate = new DateTime(today.Year, 1, 1);
                endDate = new DateTime(today.Year, 12, 31);
            }
            else
            {
                startDate = today;
                endDate = today;
            }

            // Resolve SubCompanyId
            int? targetSubCompanyId = null;
            if (adminMemberId.HasValue)
            {
                var adminMember = await _context.Members
                    .FirstOrDefaultAsync(m => m.Id == adminMemberId.Value && m.IsActive);

                if (adminMember == null)
                    return NotFound(new { message = $"Active admin member with ID {adminMemberId} not found." });

                targetSubCompanyId = adminMember.SubCompanyId;
            }

            // === Generate Birthday Notifications (from Members table ONLY) ===
            var birthdayNotifications = new List<object>();
            bool shouldIncludeBirthdays = string.IsNullOrWhiteSpace(type) ||
                                        type.Equals("Birthday", StringComparison.OrdinalIgnoreCase);

            if (shouldIncludeBirthdays && targetSubCompanyId.HasValue)
            {
                var membersWithDob = await _context.Members
                    .Where(m => m.IsActive
                                && m.SubCompanyId == targetSubCompanyId.Value
                                && m.DOB.HasValue)
                    .Select(m => new { m.Id, m.Name, m.DOB })
                    .ToListAsync();

                foreach (var member in membersWithDob)
                {
                    var dob = member.DOB.Value;
                    var thisYearBirthday = new DateTime(today.Year, dob.Month, dob.Day);

                    if (thisYearBirthday < today)
                        thisYearBirthday = thisYearBirthday.AddYears(1);

                    int daysUntil = (thisYearBirthday - today).Days;

                    if (daysUntil >= 0 && daysUntil <= 6)
                    {
                        string contentMessage;
                        bool isSelf = adminMemberId.HasValue && member.Id == adminMemberId.Value;

                        if (daysUntil == 0)
                        {
                            if (isSelf)
                            {
                                contentMessage = "Today is your birthday! 🎉";
                            }
                            else
                            {
                                contentMessage = $"Today is {member.Name}'s birthday! 🎉";
                            }
                        }
                        else if (daysUntil == 1)
                        {
                            contentMessage = $"{member.Name}'s birthday is tomorrow! 🎂";
                        }
                        else
                        {
                            contentMessage = $"{member.Name}'s birthday is in {daysUntil} days! 🎂";
                        }

                        birthdayNotifications.Add(new
                        {
                            Id = -1_000_000 - member.Id,
                            MessageType = "Birthday",
                            MemberIds = "*",
                            Subject = isSelf ? "Happy Birthday!" : "Birthday Reminder!",
                            Content = contentMessage,
                            AttachmentUrl = (string?)null,
                            Date = thisYearBirthday.ToString("yyyy-MM-dd"),
                            SentDate = (DateTime?)now,
                            IsSent = true,
                            CreatedBy = "System",
                            CreatedDate = now,
                            UpdatedDate = (DateTime?)null,
                            SubCompanyId = targetSubCompanyId.Value
                        });
                    }
                }
            }

            // If user explicitly requested ONLY birthdays, return only those
            if (!string.IsNullOrWhiteSpace(type) && type.Equals("Birthday", StringComparison.OrdinalIgnoreCase))
            {
                var sortedBirthdays = birthdayNotifications
                    .OrderByDescending(item =>
                    {
                        if (item is IDictionary<string, object> dict && dict.TryGetValue("CreatedDate", out var dateObj))
                            return (DateTime)dateObj;
                        return now;
                    })
                    .ToList();

                return Ok(new
                {
                    fromDate = startDate,
                    toDate = endDate,
                    period = period?.ToLowerInvariant(),
                    type = type,
                    adminMemberId = adminMemberId,
                    totalRecords = sortedBirthdays.Count,
                    data = sortedBirthdays
                });
            }

            // === Load non-birthday notifications ===
            var eventTypes = new[] { "Event", "Meeting" };
            var broadcastTypes = new[] { "Welcome", "NewMember" };
            var nonBirthdayQuery = _context.MessageNotifications
      .Include(m => m.CreatedByMember)
      .Where(m =>
          m.MessageType != "Birthday" &&
          (
              // Events/Meetings: Use Date/SentDate for relevance; allow older CreatedDate
              (eventTypes.Contains(m.MessageType) &&
               (
                   (m.Date.HasValue && m.Date.Value.Date >= startDate && m.Date.Value.Date <= endDate) ||
                   (m.SentDate.HasValue && m.SentDate.Value.Date >= startDate && m.SentDate.Value.Date <= endDate) ||
                   (!m.Date.HasValue && !m.SentDate.HasValue && m.CreatedDate >= startDate && m.CreatedDate <= endDate.AddDays(1).AddTicks(-1))
               ))
              ||
              // Broadcast & other types: still bound by CreatedDate
              (broadcastTypes.Contains(m.MessageType) && m.CreatedDate >= startDate && m.CreatedDate <= endDate.AddDays(1).AddTicks(-1))
              ||
              // Payment: bound by CreatedDate (or adjust if needed)
              (m.MessageType == "Payment" &&
               !string.IsNullOrEmpty(m.MemberIds) &&
               m.MemberIds.Contains(adminMemberId.ToString()) &&
               m.CreatedDate >= startDate && m.CreatedDate <= endDate.AddDays(1).AddTicks(-1))
              ||
              (m.MessageType == "Birthday" &&
               !string.IsNullOrEmpty(m.MemberIds) &&
               m.MemberIds.Contains(adminMemberId.ToString()) &&
               m.CreatedDate >= startDate && m.CreatedDate <= endDate.AddDays(1).AddTicks(-1))
          )
      );

            if (!string.IsNullOrWhiteSpace(type))
            {
                nonBirthdayQuery = nonBirthdayQuery.Where(m => m.MessageType == type);
            }

            if (targetSubCompanyId.HasValue)
            {
                nonBirthdayQuery = nonBirthdayQuery.Where(m => m.SubCompanyId == targetSubCompanyId.Value);
            }

            var rawNonBirthday = await nonBirthdayQuery.ToListAsync();
            var nonBirthdayNotifications = rawNonBirthday
                .OrderByDescending(m => m.CreatedDate)
                .ToList();

            // === Generate New Member Notifications ===
            var newMemberNotifications = new List<object>();
            bool shouldIncludeNewMembers = string.IsNullOrWhiteSpace(type) ||
                                         type.Equals("NewMember", StringComparison.OrdinalIgnoreCase);

            if (shouldIncludeNewMembers && targetSubCompanyId.HasValue)
            {
                var newMembers = await _context.Members
                    .Where(m => m.IsActive
                                && m.SubCompanyId == targetSubCompanyId.Value
                                && m.JoinDate.HasValue
                                && m.JoinDate.Value.Date == today)
                    .Select(m => new { m.Id, m.Name, m.SubCompanyId })
                    .ToListAsync();

                foreach (var member in newMembers)
                {
                    newMemberNotifications.Add(new
                    {
                        Id = -2_000_000 - member.Id,
                        MessageType = "NewMember",
                        MemberIds = "*",
                        Subject = "New Member Alert",
                        Content = $"New member joined: {member.Name}",
                        AttachmentUrl = (string?)null,
                        Date = (string?)null,
                        SentDate = (DateTime?)now,
                        IsSent = true,
                        CreatedBy = "System",
                        CreatedDate = now,
                        UpdatedDate = (DateTime?)null,
                        SubCompanyId = member.SubCompanyId
                    });
                }
            }

            // === Merge All Results ===
            var allNotifications = new List<object>();

            // Add non-birthday notifications (includes filtered Birthday wishes)
            foreach (var n in nonBirthdayNotifications)
            {
                allNotifications.Add(new
                {
                    n.Id,
                    n.MessageType,
                    n.MemberIds,
                    n.Subject,
                    n.Content,
                    n.AttachmentUrl,
                    Date = n.Date?.ToString("yyyy-MM-dd"),
                    n.SentDate,
                    n.IsSent,
                    CreatedBy = n.CreatedByMember?.Name ?? "System",
                    n.CreatedDate,
                    n.UpdatedDate,
                    n.SubCompanyId
                });
            }

            // Add system-generated birthday notifications
            allNotifications.AddRange(birthdayNotifications);
            allNotifications.AddRange(newMemberNotifications);

            // Sort by CreatedDate (descending)
            var sortedNotifications = allNotifications
                .OrderByDescending(item =>
                {
                    if (item is IDictionary<string, object> dict && dict.TryGetValue("CreatedDate", out var dateObj))
                        return (DateTime)dateObj;
                    return now;
                })
                .ToList();

            return Ok(new
            {
                fromDate = startDate,
                toDate = endDate,
                period = period?.ToLowerInvariant(),
                type = type,
                adminMemberId = adminMemberId,
                totalRecords = sortedNotifications.Count,
                data = sortedNotifications
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching message notification report", error = ex.Message });
        }
    }
    public class SendBirthdayWishDto
    {
        public int MemberId { get; set; }
        public int CreatedBy { get; set; }
        public string? CustomMessage { get; set; } // Optional override
    }

    [HttpPost("birthday/wish")]
    public async Task<ActionResult<MessageNotification>> SendBirthdayWishToMember([FromBody] SendBirthdayWishDto dto)
    {
        try
        {
            if (dto.MemberId <= 0)
                return BadRequest("Valid MemberId is required.");

            if (dto.CreatedBy <= 0)
                return BadRequest("Valid CreatedBy ID is required.");

            // Validate recipient
            var recipient = await _context.Members
                .FirstOrDefaultAsync(m => m.Id == dto.MemberId && m.IsActive);

            if (recipient == null)
                return NotFound($"Member with ID {dto.MemberId} not found.");

            // Validate sender
            var sender = await _context.Members
                .FirstOrDefaultAsync(m => m.Id == dto.CreatedBy && m.IsActive);

            if (sender == null)
                return BadRequest("Invalid sender (CreatedBy) ID.");

            // Optional: Ensure same sub-company
            if (recipient.SubCompanyId != sender.SubCompanyId)
                return BadRequest("Sender and recipient must belong to the same sub-company.");

            // Build message
            string subject = "🎉 Happy Birthday!";
            string content = !string.IsNullOrWhiteSpace(dto.CustomMessage)
                ? dto.CustomMessage
                : $"Dear {recipient.Name},\n\nWishing you a wonderful birthday filled with joy, success, and great company!\n\nWarm regards,\nThe Alaigal Team";

            var notification = new MessageNotification
            {
                MessageType = "Birthday",
                MemberIds = dto.MemberId.ToString(),
                Subject = subject,
                Content = content,

                AttachmentUrl = "https://cdn.alaigal.com/images/birthday-cake.png",
                CreatedBy = dto.CreatedBy,
                CreatedDate = DateTime.UtcNow,
                SubCompanyId = recipient.SubCompanyId,
                IsSent = true,
                SentDate = DateTime.UtcNow
            };

            // Save message notification first
            _context.MessageNotifications.Add(notification);
            await _context.SaveChangesAsync();

            // ✅ SAVE TO BIRTHDAY WISH LOG TABLE (as per your schema)
            var wishLog = new BirthdayWishLog
            {
                MemberId = dto.MemberId,      // Recipient ID
                SentById = dto.CreatedBy,     // Sender ID
                SentDate = DateTime.UtcNow     // Exact time sent
            };

            _context.BirthdayWishLogs.Add(wishLog);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMessageNotification), new { id = notification.Id }, notification);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error sending birthday wish",
                error = ex.Message
            });
        }
    }
    public class CreateMessageNotificationDto
    {
        [Required]
        public string MessageType { get; set; } = "Welcome"; // Birthday, Payment, Event, Meeting, Welcome

        public string? MemberIds { get; set; } // e.g., "5" or "5,8,12"
        public DateTime? Date { get; set; } // For event/meeting date
        [Required]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        public string? AttachmentUrl { get; set; }
        public int? CreatedBy { get; set; }
        public int? SubCompanyId { get; set; }

        // Optional for payment validation
        public DateTime? PaymentDate { get; set; }
        public string? PaymentForMonth { get; set; }
    }

    public class UpdateMessageNotificationDto
    {
        public string? Subject { get; set; }
        public string? Content { get; set; }
        public string? AttachmentUrl { get; set; }
        public int? UpdatedBy { get; set; }
    }
}