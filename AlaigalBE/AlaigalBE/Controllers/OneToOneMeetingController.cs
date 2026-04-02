using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Alaigal.Data;
using Alaigal.Models;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class OneToOneMeetingController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    public OneToOneMeetingController(AlaigalRefContext context)
    {
        _context = context;
    }

    // GET: api/OneToOneMeeting
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OneToOneMeeting>>> GetMeetings()
    {
        try
        {
            var meetings = await _context.OneToOneMeetings
                .Include(m => m.Member1)
                .Include(m => m.Member2)
                .OrderByDescending(m => m.MeetingDate)
                .ToListAsync();
            return Ok(meetings);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching meetings", error = ex.Message });
        }
    }

    // GET: api/OneToOneMeeting/5
    [HttpGet("{id}")]
    public async Task<ActionResult<OneToOneMeeting>> GetMeeting(int id)
    {
        try
        {
            var meeting = await _context.OneToOneMeetings
                .Include(m => m.Member1)
                .Include(m => m.Member2)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (meeting == null)
            {
                return NotFound();
            }

            return Ok(meeting);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching meeting", error = ex.Message });
        }
    }

    // POST: api/OneToOneMeeting
    [HttpPost]
    public async Task<ActionResult<OneToOneMeeting>> CreateMeeting([FromBody] CreateOneToOneMeetingDto dto)
    {
        try
        {
            if (dto == null)
                return BadRequest("Request body cannot be empty");

            if (dto.Member1Id <= 0)
                return BadRequest("Member1Id must be a valid member ID");

            if (dto.Member2Id <= 0)
                return BadRequest("Member2Id must be a valid member ID");

            // Fetch Member1 to get SubCompanyId and validate existence
            var member1 = await _context.Members
                .Where(m => m.Id == dto.Member1Id)
                .Select(m => new { m.Id, m.SubCompanyId })
                .FirstOrDefaultAsync();

            if (member1 == null)
                return BadRequest($"Member with ID {dto.Member1Id} not found");

            // Validate Member2 exists (no need for SubCompanyId unless enforcing same sub-company)
            var member2Exists = await _context.Members
                .AnyAsync(m => m.Id == dto.Member2Id);

            if (!member2Exists)
                return BadRequest($"Member with ID {dto.Member2Id} not found");

            // Create meeting record
            var meeting = new OneToOneMeeting
            {
                Member1Id = dto.Member1Id,
                Member2Id = dto.Member2Id,
                MeetingDate = dto.MeetingDate ?? DateTime.Now,
                Location = dto.Location,
                MetWith = dto.MetWith,
                Topic = dto.Topic,
                Status = dto.Status ?? "Completed",
                CreatedDate = DateTime.Now,
                SubCompanyId = member1.SubCompanyId // ✅ Set from Member1
            };

            _context.OneToOneMeetings.Add(meeting);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMeeting), new { id = meeting.Id }, meeting);
        }
        catch (DbUpdateException dbEx)
        {
            return StatusCode(500, new
            {
                message = "Database error",
                error = dbEx.InnerException?.Message ?? dbEx.Message
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error creating meeting",
                error = ex.Message
            });
        }
    }

    // PUT: api/OneToOneMeeting/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMeeting(int id, [FromBody] UpdateOneToOneMeetingDto dto)
    {
        try
        {
            var meeting = await _context.OneToOneMeetings.FindAsync(id);
            if (meeting == null)
            {
                return NotFound();
            }

            meeting.Location = dto.Location ?? meeting.Location;
            meeting.MetWith = dto.MetWith ?? meeting.MetWith;
            meeting.Topic = dto.Topic ?? meeting.Topic;
            meeting.Status = dto.Status ?? meeting.Status;
            meeting.MeetingDate = dto.MeetingDate ?? meeting.MeetingDate;
            meeting.UpdatedDate = DateTime.Now;

            _context.OneToOneMeetings.Update(meeting);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating meeting", error = ex.Message });
        }
    }
    // GET: api/OneToOneMeeting/report
    [HttpGet("report")]
    public async Task<ActionResult<object>> GetOneToOneMeetingReport(
      [FromQuery] DateTime? fromDate = null,
      [FromQuery] DateTime? toDate = null,
      [FromQuery] string? period = "daily",
      [FromQuery] int? memberId = null,
      [FromQuery] int? adminMemberId = null,
      [FromQuery] int? subCompanyId = null)
    {
        try
        {
            // 🔹 Define your application's business timezone (e.g., IST)
            var appTimeZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
            var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, appTimeZone).Date;

            DateTime startDate, endDate;

            // Determine date range based on inputs
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

            // Ensure correct order
            if (startDate > endDate)
                (startDate, endDate) = (endDate, startDate);

            // 🔹 Extend endDate to end of the day for inclusive filtering
            var queryEndDate = endDate.Date.AddDays(1).AddTicks(-1); // e.g., 2026-01-30 23:59:59.9999999

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
            var query = _context.OneToOneMeetings
                .Include(m => m.Member1)
                .Include(m => m.Member2)
                .Where(m => m.MeetingDate >= startDate && m.MeetingDate <= queryEndDate);

            // 🔑 Apply filters
            if (adminMemberId.HasValue && memberId.HasValue)
            {
                // Admin + specific member in same company
                query = query.Where(m =>
                    (m.Member1Id == memberId.Value || m.Member2Id == memberId.Value) &&
                    m.SubCompanyId == targetSubCompanyId.Value);
            }
            else if (adminMemberId.HasValue)
            {
                // Admin view: all meetings in company
                query = query.Where(m => m.SubCompanyId == targetSubCompanyId.Value);
            }
            else if (memberId.HasValue)
            {
                // Member view: no company restriction
                query = query.Where(m =>
                    m.Member1Id == memberId.Value ||
                    m.Member2Id == memberId.Value);
            }
            // else: global view (no filters)

            // Execute query
            var meetingsFromDb = await query
                .OrderByDescending(m => m.MeetingDate)
                .ToListAsync();

            // Project in memory
            var meetings = meetingsFromDb.Select(m => new
            {
                m.Id,
                Member1Id = m.Member1Id,
                Member1Name = m.Member1?.Name ?? "Unknown",
                Member2Id = m.Member2Id,
                Member2Name = m.Member2?.Name ?? "Unknown",
                m.MeetingDate,
                m.Location,
                m.Duration,
                m.Notes,
                m.Status,
                m.MetWith,
                m.Topic,
                SubCompanyId = m.SubCompanyId ??
                              m.Member1?.SubCompanyId ??
                              m.Member2?.SubCompanyId,
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
            // Log exception here if using ILogger
            return StatusCode(500, new { message = "Error fetching one-to-one meeting report", error = ex.Message });
        }
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMeeting(int id)
    {
        try
        {
            var meeting = await _context.OneToOneMeetings.FindAsync(id);
            if (meeting == null)
            {
                return NotFound();
            }

            _context.OneToOneMeetings.Remove(meeting);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting meeting", error = ex.Message });
        }
    }
}

// DTOs
public class CreateOneToOneMeetingDto
{
    public int Member1Id { get; set; }
    public int Member2Id { get; set; }
    public DateTime? MeetingDate { get; set; }
    public string? Location { get; set; }
    public string? MetWith { get; set; }
    public string? Topic { get; set; }
    public string? Status { get; set; }
}

public class UpdateOneToOneMeetingDto
{
    public DateTime? MeetingDate { get; set; }
    public string? Location { get; set; }
    public string? MetWith { get; set; }
    public string? Topic { get; set; }
    public string? Status { get; set; }
}
