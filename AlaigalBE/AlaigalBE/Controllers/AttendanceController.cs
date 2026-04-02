using System.ComponentModel.DataAnnotations;
using Alaigal.Data;
using Alaigal.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AttendanceController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    public AttendanceController(AlaigalRefContext context)
    {
        _context = context;
    }

    // GET: api/Attendance

    // GET: api/Attendance
    // Supports: ?fromDate=2025-01-01&toDate=2025-01-31&period=monthly
    [HttpGet]
    public async Task<ActionResult<object>> GetAttendance(
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

            // 🔑 Handle adminMemberId: get SubCompanyId from admin member
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

            // 🔑 Handle regular memberId: validate existence
            if (memberId.HasValue)
            {
                var memberExists = await _context.Members
                    .AnyAsync(m => m.Id == memberId.Value && m.IsActive);

                if (!memberExists)
                {
                    return NotFound(new { message = $"Active member with ID {memberId} not found." });
                }
            }

            // === CASE 1: Single member view → only return actual attendance (no absent logic) ===
            if (memberId.HasValue)
            {
                var attendancesFromDb = await _context.Attendance
                    .Include(a => a.Member)
                    .Where(a => a.IsActive &&
                                a.AttendanceDate >= startDate &&
                                a.AttendanceDate <= endDate &&
                                a.MemberId == memberId.Value)
                    .OrderByDescending(a => a.AttendanceDate)
                    .ThenByDescending(a => a.CheckInTime)
                    .ToListAsync();

                var attendances = attendancesFromDb.Select(a => new AttendanceReportItem
                {
                    Id = a.Id,
                    MemberId = a.MemberId,
                    MemberName = a.Member?.Name ?? "Unknown",
                    AttendanceDate = a.AttendanceDate,
                    CheckInTime = a.CheckInTime,
                    CheckOutTime = a.CheckOutTime,
                    Status = a.Status ?? "Present",
                    Notes = a.Notes,
                    Batch = a.Batch,
                    SubCompanyId = a.SubCompanyId ?? a.Member?.SubCompanyId,
                    CreatedDate = a.CreatedDate,
                    UpdatedDate = a.UpdatedDate
                }).ToList();

                return Ok(new
                {
                    fromDate = startDate,
                    toDate = endDate,
                    period = period?.ToLowerInvariant(),
                    memberId = memberId,
                    adminMemberId = adminMemberId,
                    totalRecords = attendances.Count,
                    data = attendances
                });
            }

            // === CASE 2: Admin or global view → include ABSENT members (only meaningful with adminMemberId) ===
            var membersQuery = _context.Members.Where(m => m.IsActive);

            if (adminMemberId.HasValue)
            {
                membersQuery = membersQuery.Where(m => m.SubCompanyId == targetSubCompanyId.Value);
            }

            var members = await membersQuery
                .Select(m => new { m.Id, m.Name, m.SubCompanyId })
                .ToListAsync();

            if (!members.Any())
            {
                return Ok(new
                {
                    fromDate = startDate,
                    toDate = endDate,
                    period = period?.ToLowerInvariant(),
                    memberId = memberId,
                    adminMemberId = adminMemberId,
                    totalRecords = 0,
                    data = new List<AttendanceReportItem>()
                });
            }

            // Generate all dates in the selected range
            var dateRange = new List<DateTime>();
            for (var date = startDate; date <= endDate; date = date.AddDays(1))
            {
                dateRange.Add(date);
            }

            var memberIds = members.Select(m => m.Id).ToList();

            // Fetch existing attendance records in the date range
            var existingAttendance = await _context.Attendance
                .Where(a => a.IsActive &&
                            a.AttendanceDate >= startDate &&
                            a.AttendanceDate <= endDate &&
                            memberIds.Contains(a.MemberId))
                .Select(a => new
                {
                    a.MemberId,
                    a.AttendanceDate,
                    a.CheckInTime,
                    a.CheckOutTime,
                    a.Status,
                    a.Notes,
                    a.Batch,
                    a.SubCompanyId,
                    a.CreatedDate,
                    a.UpdatedDate
                })
                .ToListAsync();

            var attendanceLookup = existingAttendance
                .ToLookup(a => new { a.MemberId, a.AttendanceDate });

            // Build full result including Absent
            var result = new List<AttendanceReportItem>();

            foreach (var member in members)
            {
                foreach (var date in dateRange)
                {
                    var key = new { MemberId = member.Id, AttendanceDate = date };
                    var record = attendanceLookup[key].FirstOrDefault();

                    if (record != null)
                    {
                        // Present
                        result.Add(new AttendanceReportItem
                        {
                            Id = null, // No real attendance ID for consistency (or omit if unused)
                            MemberId = member.Id,
                            MemberName = member.Name,
                            AttendanceDate = date,
                            CheckInTime = record.CheckInTime,
                            CheckOutTime = record.CheckOutTime,
                            Status = record.Status ?? "Present",
                            Notes = record.Notes,
                            Batch = record.Batch,
                            SubCompanyId = record.SubCompanyId ?? member.SubCompanyId,
                            CreatedDate = record.CreatedDate,
                            UpdatedDate = record.UpdatedDate
                        });
                    }
                    else
                    {
                        // Absent
                        result.Add(new AttendanceReportItem
                        {
                            Id = null,
                            MemberId = member.Id,
                            MemberName = member.Name,
                            AttendanceDate = date,
                            CheckInTime = null,
                            CheckOutTime = null,
                            Status = "Absent",
                            Notes = null,
                            Batch = null,
                            SubCompanyId = member.SubCompanyId,
                            CreatedDate = null,
                            UpdatedDate = null
                        });
                    }
                }
            }

            // Sort: latest date first, then by name
            var sortedResult = result
                .OrderByDescending(r => r.AttendanceDate)
                .ThenBy(r => r.MemberName)
                .ToList();

            return Ok(new
            {
                fromDate = startDate,
                toDate = endDate,
                period = period?.ToLowerInvariant(),
                memberId = memberId,
                adminMemberId = adminMemberId,
                totalRecords = sortedResult.Count,
                data = sortedResult
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching attendance", error = ex.Message });
        }
    }
    // Place this in your Models folder or at the bottom of your controller file
    public class AttendanceReportItem
    {
        public object? Id { get; set; }
        public int MemberId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public DateTime AttendanceDate { get; set; }
        public TimeSpan? CheckInTime { get; set; }
        public TimeSpan? CheckOutTime { get; set; }
        public string Status { get; set; } = "Absent";
        public string? Notes { get; set; }
        public string? Batch { get; set; }
        public int? SubCompanyId { get; set; }
        public DateTime? CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
    }
    // GET: api/Attendance/member/5
    [HttpGet("member/{memberId}")]
    public async Task<ActionResult<IEnumerable<Attendance>>> GetMemberAttendance(int memberId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var query = _context.Attendance
            .Where(a => a.MemberId == memberId && a.IsActive);

        if (startDate.HasValue)
        {
            query = query.Where(a => a.AttendanceDate >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(a => a.AttendanceDate <= endDate.Value);
        }

        return await query.OrderByDescending(a => a.AttendanceDate).ToListAsync();
    }

    // GET: api/Attendance/report
    [HttpGet("report")]
    public async Task<ActionResult<object>> GetAttendanceReport([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var query = _context.Attendance.Where(a => a.IsActive);

        if (startDate.HasValue)
        {
            query = query.Where(a => a.AttendanceDate >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(a => a.AttendanceDate <= endDate.Value);
        }

        var attendances = await query.ToListAsync();

        var report = new
        {
            totalRecords = attendances.Count,
            present = attendances.Count(a => a.Status == "Present"),
            absent = attendances.Count(a => a.Status == "Absent"),
            late = attendances.Count(a => a.Status == "Late"),
            leave = attendances.Count(a => a.Status == "Leave")
        };

        return report;
    }

    [HttpPost]
    public async Task<ActionResult<Attendance>> CreateAttendance([FromBody] CreateAttendanceRequest request)
    {
        try
        {
            if (request?.MemberId <= 0)
                return BadRequest("Valid MemberId is required.");

            // 🔑 Validate admin member
            var adminMember = await _context.Members
                .FirstOrDefaultAsync(m => m.Id == request.AdminMemberId && m.IsActive);

            if (adminMember == null)
                return BadRequest("Invalid admin member ID.");

            var attendanceDate = request.AttendanceDate?.Date ?? DateTime.UtcNow.Date;

            if (attendanceDate > DateTime.UtcNow.Date)
                return BadRequest("Attendance date cannot be in the future.");

            var now = DateTime.UtcNow;

            // ==========================================
            // 🔎 CHECK IF MEETING EXISTS FOR THAT DATE
            // ==========================================

            var meeting = await _context.MeetingDetails
                .FirstOrDefaultAsync(m =>
                    m.IsActive &&
                    m.SubCompanyId == adminMember.SubCompanyId &&
                    m.MeetingDate == DateOnly.FromDateTime(attendanceDate));

            int? meetingId = meeting?.Id;

            // ==========================================
            // CHECK EXISTING ATTENDANCE
            // ==========================================

            var existing = await _context.Attendance
                .FirstOrDefaultAsync(a =>
                    a.MemberId == request.MemberId &&
                    a.AttendanceDate == attendanceDate);

            if (existing != null)
            {
                // ✅ UPDATE
                existing.CheckInTime = now.TimeOfDay;
                existing.Notes = request.Notes ?? existing.Notes;
                existing.Batch = request.Batch ?? existing.Batch;
                existing.Status = !string.IsNullOrWhiteSpace(request.Status)
                    ? request.Status
                    : existing.Status ?? "Present";

                existing.UpdatedDate = now;
                existing.UpdatedBy = request.AdminMemberId.ToString();
                existing.SubCompanyId = adminMember.SubCompanyId;

                // 🔥 SET MEETING ID
                existing.MeetingId = meetingId;

                await _context.SaveChangesAsync();
                return Ok(existing);
            }
            else
            {
                // ✅ CREATE NEW
                var newAttendance = new Attendance
                {
                    MemberId = request.MemberId,
                    AttendanceDate = attendanceDate,
                    CheckInTime = now.TimeOfDay,
                    Status = !string.IsNullOrWhiteSpace(request.Status)
                        ? request.Status
                        : "Present",
                    Notes = request.Notes,
                    Batch = request.Batch,
                    IsActive = true,
                    CreatedBy = request.AdminMemberId.ToString(),
                    CreatedDate = now,
                    SubCompanyId = adminMember.SubCompanyId,

                    // 🔥 STORE MEETING ID HERE
                    MeetingId = meetingId
                };

                _context.Attendance.Add(newAttendance);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetAttendance),
                    new { id = newAttendance.Id },
                    newAttendance);
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error creating attendance",
                error = ex.Message
            });
        }
    }
    public class CreateAttendanceRequest
    {
        public int? MeetingId { get; set; }
        public int MemberId { get; set; }
        public string MemberName { get; set; } = string.Empty; // ← REQUIRED

        public DateTime? AttendanceDate { get; set; }

        public string? Notes { get; set; }
        public string? Batch { get; set; }
        public string? Status { get; set; }

        // 🔑 Admin Member ID (the person creating this attendance)
        [Required]
        public int AdminMemberId { get; set; }
    }
    public class BulkCreateAttendanceDto
    {
        [Required]
        public int AdminMemberId { get; set; } // The admin creating these records

        [Required]
        public List<CreateAttendanceRequest> Attendances { get; set; } = new();
    }
    // POST: api/Attendance/bulk
    [HttpPost("bulk")]
    public async Task<ActionResult<object>> CreateBulkAttendance([FromBody] BulkCreateAttendanceDto dto)
    {
        try
        {
            if (dto?.Attendances == null || !dto.Attendances.Any())
                return BadRequest("Attendance list is required.");

            var adminMember = await _context.Members
                .FirstOrDefaultAsync(m => m.Id == dto.AdminMemberId && m.IsActive);

            if (adminMember == null)
                return BadRequest("Invalid admin member ID.");

            var now = DateTime.UtcNow;
            var subCompanyId = adminMember.SubCompanyId;

            int successCount = 0;
            int failCount = 0;
            var errors = new List<string>();

            foreach (var request in dto.Attendances)
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(request.MemberName))
                        throw new ArgumentException("Member name is required.");

                    // ✅ FIXED: Use simple equality (EF Core translatable)
                    var memberName = request.MemberName.Trim();
                    var member = await _context.Members
                        .FirstOrDefaultAsync(m =>
                            m.Name == memberName &&
                            m.IsActive &&
                            m.SubCompanyId == subCompanyId);

                    if (member == null)
                    {
                        throw new ArgumentException($"Member '{request.MemberName}' not found.");
                    }

                    var attendanceDate = request.AttendanceDate?.Date ?? now.Date;

                    if (attendanceDate > now.Date)
                        throw new ArgumentException("Attendance date cannot be in the future.");

                    var existing = await _context.Attendance
                        .FirstOrDefaultAsync(a =>
                            a.MemberId == member.Id &&
                            a.AttendanceDate == attendanceDate);

                    if (existing != null)
                    {
                        existing.CheckInTime = now.TimeOfDay;
                        existing.Notes = request.Notes ?? existing.Notes;
                        existing.Batch = request.Batch ?? existing.Batch;
                        existing.Status = "Present";
                        existing.UpdatedDate = now;
                        existing.UpdatedBy = dto.AdminMemberId.ToString();
                        existing.SubCompanyId = subCompanyId;
                        successCount++;
                    }
                    else
                    {
                        var newAttendance = new Attendance
                        {
                            MemberId = member.Id,
                            AttendanceDate = attendanceDate,
                            CheckInTime = now.TimeOfDay,
                            Status = "Present",
                            Notes = request.Notes,
                            Batch = request.Batch,
                            IsActive = true,
                            CreatedBy = dto.AdminMemberId.ToString(),
                            CreatedDate = now,
                            SubCompanyId = subCompanyId
                        };

                        _context.Attendance.Add(newAttendance);
                        successCount++;
                    }
                }
                catch (Exception ex)
                {
                    failCount++;
                    errors.Add($"Failed for '{request?.MemberName}': {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                successCount,
                failCount,
                totalProcessed = dto.Attendances.Count,
                errors
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error in bulk attendance creation", error = ex.Message });
        }
    }

    // PUT: api/Attendance/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAttendance(int id, Attendance attendance)
    {
        if (id != attendance.Id)
        {
            return BadRequest();
        }

        attendance.UpdatedDate = DateTime.UtcNow;
        _context.Entry(attendance).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!AttendanceExists(id))
            {
                return NotFound();
            }
            throw;
        }

        return NoContent();
    }

    // DELETE: api/Attendance/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAttendance(int id)
    {
        var attendance = await _context.Attendance.FindAsync(id);
        if (attendance == null)
        {
            return NotFound();
        }

        attendance.IsActive = false;
        attendance.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool AttendanceExists(int id)
    {
        return _context.Attendance.Any(e => e.Id == id);
    }
}
