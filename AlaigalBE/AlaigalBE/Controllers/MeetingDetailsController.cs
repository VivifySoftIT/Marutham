// Controllers/MeetingDetailsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Alaigal.Data;
using Alaigal.Models;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class MeetingDetailsController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    public MeetingDetailsController(AlaigalRefContext context)
    {
        _context = context;
    }

    // GET: api/MeetingDetails
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetMeetingDetails([FromQuery] int? subCompanyId = null)
    {
        try
        {
            var query = _context.MeetingDetails
                .Where(m => m.IsActive)
                .AsQueryable();

            if (subCompanyId.HasValue)
                query = query.Where(m => m.SubCompanyId == subCompanyId.Value);

            var meetings = await query
                .OrderByDescending(m => m.MeetingDate)
                .ThenByDescending(m => m.Time)
                .Select(m => new
                {
                    m.Id,
                    m.SubCompanyId,
                    m.MeetingCode,
                    m.MeetingDate,
                    m.Place,
                    m.Time,
                    m.ContactPersonName,
                    m.ContactPersonNum,
                    m.MeetingTitle,
                    m.Description,
                    m.MeetingType,
                    m.MeetingLink,
                    m.MemberDetails,
                    m.PosterImageUrl,
                    m.CreatedDate,
                    m.UpdatedDate
                })
                .ToListAsync();

            return Ok(meetings);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching meeting details", error = ex.Message });
        }
    }

    // GET: api/MeetingDetails/5
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetMeetingDetail(int id)
    {
        try
        {
            var meeting = await _context.MeetingDetails
                .Where(m => m.Id == id && m.IsActive)
                .Select(m => new
                {
                    m.Id,
                    m.SubCompanyId,
                    m.MeetingCode,
                    m.MeetingDate,
                    m.Place,
                    m.Time,
                    m.ContactPersonName,
                    m.ContactPersonNum,
                    m.MeetingTitle,
                    m.Description,
                    m.MeetingType,
                    m.MeetingLink,
                    m.MemberDetails,
                    m.PosterImageUrl,
                    m.CreatedDate,
                    m.UpdatedDate
                })
                .FirstOrDefaultAsync();

            if (meeting == null)
            {
                return NotFound(new { message = "Meeting not found" });
            }

            return Ok(meeting);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching meeting detail", error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<MeetingDetail>> CreateMeetingDetail(MeetingDetail meeting)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(meeting.MeetingCode))
            {
                // Only match codes starting with "M" (uppercase)
                var existingMCodes = await _context.MeetingDetails
                    .Where(m => m.MeetingCode != null &&
                                m.MeetingCode.Length > 1 &&
                                m.MeetingCode.StartsWith("M"))
                    .Select(m => m.MeetingCode)
                    .ToListAsync();

                int maxNumber = 0;
                foreach (var code in existingMCodes)
                {
                    var numberPart = code.Substring(1);
                    if (int.TryParse(numberPart, out int num))
                    {
                        if (num > maxNumber) maxNumber = num;
                    }
                }

                meeting.MeetingCode = $"M{maxNumber + 1:D2}";
            }

            if (meeting.CreatedBy.HasValue)
            {
                var member = await _context.Members
                    .FirstOrDefaultAsync(m => m.Id == meeting.CreatedBy.Value && m.IsActive);

                if (member == null)
                {
                    return BadRequest(new { message = "Invalid CreatedBy: Member not found or inactive." });
                }

                meeting.SubCompanyId = member.SubCompanyId;
            }

            meeting.CreatedDate = DateTime.UtcNow;
            meeting.UpdatedDate = DateTime.UtcNow;
            meeting.IsActive = true;

            _context.MeetingDetails.Add(meeting);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMeetingDetail), new { id = meeting.Id }, meeting);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating meeting", error = ex.Message });
        }
    }
    // POST: api/MeetingDetails/{id}/poster
    [HttpPost("{id}/poster")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public async Task<IActionResult> UploadPoster(int id, IFormFile file,
        [FromServices] IHttpClientFactory httpClientFactory)
    {
        try
        {
            var meeting = await _context.MeetingDetails.FindAsync(id);
            if (meeting == null)
                return NotFound(new { message = "Meeting not found" });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided" });

            var allowedTypes = new[] { "image/jpeg", "image/png", "image/jpg", "image/webp" };
            if (!allowedTypes.Contains(file.ContentType.ToLower()))
                return BadRequest(new { message = "Only image files are allowed (jpg, png, webp)" });

            // Generate GUID filename matching the Video API URL pattern
            var ext = Path.GetExtension(file.FileName).TrimStart('.').ToLower();
            var guidFileName = $"{Guid.NewGuid()}.{(ext == "jpg" ? "jpeg" : ext)}";

            // Try to save to the Video API folder on the same server
            // Path: wwwroot/Video/ which is served as /api/Video/{filename}
            var videoFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "Video");
            Directory.CreateDirectory(videoFolder);
            var filePath = Path.Combine(videoFolder, guidFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
                await file.CopyToAsync(stream);

            // Store URL in the same pattern as existing video files
            var posterUrl = $"https://www.vivifysoft.in/api/Video/{guidFileName}";

            meeting.PosterImageUrl = posterUrl;
            meeting.UpdatedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { posterImageUrl = posterUrl });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error uploading poster", error = ex.Message });
        }
    }

    // PUT: api/MeetingDetails/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMeetingDetail(int id, MeetingDetail meeting)
    {
        if (id != meeting.Id)
        {
            return BadRequest(new { message = "ID mismatch" });
        }

        if (!_context.MeetingDetails.Any(m => m.Id == id && m.IsActive))
        {
            return NotFound(new { message = "Meeting not found" });
        }

        try
        {
            meeting.UpdatedDate = DateTime.UtcNow;
            _context.Entry(meeting).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.MeetingDetails.Any(m => m.Id == id))
            {
                return NotFound(new { message = "Meeting no longer exists" });
            }
            throw;
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating meeting", error = ex.Message });
        }
    }
    // GET: api/MeetingDetails/report
    [HttpGet("report")]
    public async Task<ActionResult<object>> GetMeetingReport(
     [FromQuery] DateTime? fromDate = null,
     [FromQuery] DateTime? toDate = null,
     [FromQuery] string? period = "daily",
     [FromQuery] int? memberId = null,
     [FromQuery] int? adminMemberId = null,
     [FromQuery] int? subCompanyId = null)
    {
        try
        {
            // 🔹 Use business timezone (e.g., India Standard Time)
            var appTimeZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
            var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, appTimeZone).Date;

            DateTime startDate, endDate;

            // Determine date range
            if (fromDate.HasValue || toDate.HasValue)
            {
                startDate = fromDate?.Date ?? nowLocal;
                endDate = toDate?.Date ?? nowLocal;
            }
            else
            {
                switch (period?.ToLowerInvariant())
                {
                    case "weekly":
                        var startOfWeek = nowLocal.AddDays(-(int)nowLocal.DayOfWeek + (int)DayOfWeek.Monday);
                        startDate = startOfWeek;
                        endDate = startOfWeek.AddDays(6);
                        break;
                    case "monthly":
                        startDate = new DateTime(nowLocal.Year, nowLocal.Month, 1);
                        endDate = startDate.AddMonths(1).AddDays(-1);
                        break;
                    case "yearly":
                        startDate = new DateTime(nowLocal.Year, 1, 1);
                        endDate = new DateTime(nowLocal.Year, 12, 31);
                        break;
                    case "daily":
                    default:
                        startDate = nowLocal;
                        endDate = nowLocal;
                        break;
                }
            }

            if (startDate > endDate)
                (startDate, endDate) = (endDate, startDate);

            // 🔑 Convert to DateOnly for comparison (safe because we use local date)
            var startFilter = DateOnly.FromDateTime(startDate);
            var endFilter = DateOnly.FromDateTime(endDate);

            // 🔑 Handle adminMemberId — get SubCompanyId
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

            // 🔑 Handle memberId — validate and check sub-company if admin is present
            if (memberId.HasValue)
            {
                var member = await _context.Members
                    .FirstOrDefaultAsync(m => m.Id == memberId.Value && m.IsActive);

                if (member == null)
                    return NotFound(new { message = $"Active member with ID {memberId} not found." });

                if (adminMemberId.HasValue)
                {
                    if (member.SubCompanyId != targetSubCompanyId)
                    {
                        return BadRequest(new { message = "Member does not belong to the admin's sub-company." });
                    }
                }
            }

            // Build base query with DateOnly comparison
            var query = _context.MeetingDetails
                .Where(m => m.IsActive &&
                            m.MeetingDate >= startFilter &&
                            m.MeetingDate <= endFilter);

            // Apply filters
            if (adminMemberId.HasValue && memberId.HasValue)
            {
                query = query.Where(m =>
                    m.CreatedBy == memberId.Value &&
                    m.SubCompanyId == targetSubCompanyId.Value);
            }
            else if (adminMemberId.HasValue)
            {
                query = query.Where(m => m.SubCompanyId == targetSubCompanyId.Value);
            }
            else if (memberId.HasValue)
            {
                query = query.Where(m => m.CreatedBy == memberId.Value);
            }

            // Execute query
            var meetingsFromDb = await query
                .OrderByDescending(m => m.MeetingDate)
                .ThenByDescending(m => m.Time)
                .ToListAsync();

            // Project results
            var meetings = meetingsFromDb.Select(m => new
            {
                m.Id,
                m.SubCompanyId,
                m.MeetingCode,
                m.MeetingDate,
                m.Place,
                m.Time,
                m.ContactPersonName,
                m.ContactPersonNum,
                m.MeetingTitle,
                m.Description,
                m.MeetingType,
                m.MeetingLink,
                m.MemberDetails,
                m.CreatedBy,
                m.CreatedDate,
                m.UpdatedDate
            }).ToList();

            return Ok(new
            {
                fromDate = startDate,
                toDate = endDate,
                period = period?.ToLowerInvariant(),
                memberId = memberId,
                adminMemberId = adminMemberId,
                totalRecords = meetings.Count,
                data = meetings
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching meeting report", error = ex.Message });
        }
    }
    [HttpDelete("{id}")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public async Task<IActionResult> DeleteMeetingDetail(int id)
    {
        var meeting = await _context.MeetingDetails.FindAsync(id);
        if (meeting == null || !meeting.IsActive)
        {
            return NotFound(new { message = "Meeting not found" });
        }

        try
        {
            meeting.IsActive = false;
            meeting.UpdatedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting meeting", error = ex.Message });
        }
    }

    // POST: api/MeetingDetails/{id}/delete  (IIS-safe alternative to DELETE verb)
    [HttpPost("{id}/delete")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public async Task<IActionResult> DeleteMeetingDetailPost(int id)
    {
        var meeting = await _context.MeetingDetails.FindAsync(id);
        if (meeting == null || !meeting.IsActive)
            return NotFound(new { message = "Meeting not found" });

        try
        {
            meeting.IsActive = false;
            meeting.UpdatedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Meeting deleted successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting meeting", error = ex.Message });
        }
    }

    // POST: api/MeetingDetails/{id}/rsvp
    [HttpPost("{id}/rsvp")]
    public async Task<IActionResult> SaveRsvp(int id, [FromBody] MeetingRsvpRequest request)
    {
        try
        {
            var meeting = await _context.MeetingDetails.FindAsync(id);
            if (meeting == null || !meeting.IsActive)
                return NotFound(new { message = "Meeting not found" });

            var member = await _context.Members
                .FirstOrDefaultAsync(m => m.Id == request.MemberId && m.IsActive);
            if (member == null)
                return BadRequest(new { message = "Member not found" });

            // Map int status to string: 1 = Attending, 2 = Not Attending
            string statusStr = request.Status == 1 ? "Present" : "Absent";

            var attendanceDate = meeting.MeetingDate.ToDateTime(TimeOnly.MinValue);
            var now = DateTime.UtcNow;

            var existing = await _context.Attendance
                .FirstOrDefaultAsync(a => a.MemberId == request.MemberId && a.MeetingId == id);

            if (existing != null)
            {
                existing.Status = statusStr;
                existing.UpdatedDate = now;
                existing.UpdatedBy = request.MemberId.ToString();
            }
            else
            {
                _context.Attendance.Add(new Attendance
                {
                    MemberId = request.MemberId,
                    MeetingId = id,
                    AttendanceDate = attendanceDate,
                    Status = statusStr,
                    SubCompanyId = member.SubCompanyId,
                    CreatedBy = request.MemberId.ToString(),
                    CreatedDate = now,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "RSVP saved", status = statusStr });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error saving RSVP", error = ex.Message });
        }
    }

    
}

public class MeetingRsvpRequest
{
    public int MemberId { get; set; }
    public int Status { get; set; } // 1 = Attending, 2 = Not Attending
}