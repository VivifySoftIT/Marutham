using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Alaigal.Data;
using Alaigal.Models;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TYFCBController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    public TYFCBController(AlaigalRefContext context)
    {
        _context = context;
    }

    // GET: api/TYFCB
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TYFCB>>> GetTYFCBs()
    {
        try
        {
            var tyfcbs = await _context.TYFCB
                .Include(t => t.GivenByMember)
                .Include(t => t.ReceivedByMember)
                .OrderByDescending(t => t.VisitDate)
                .ToListAsync();
            return Ok(tyfcbs);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching TYFCB records", error = ex.Message });
        }
    }

    // GET: api/TYFCB/5
    [HttpGet("{id}")]
    public async Task<ActionResult<TYFCB>> GetTYFCB(int id)
    {
        try
        {
            var tyfcb = await _context.TYFCB
                .Include(t => t.GivenByMember)
                .Include(t => t.ReceivedByMember)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tyfcb == null)
            {
                return NotFound();
            }

            return Ok(tyfcb);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching TYFCB record", error = ex.Message });
        }
    }
    [HttpPost("{id}/status")]
    public async Task<ActionResult> UpdateTYFCBStatus(int id, [FromBody] UpdateTYFCBStatusDto dto)
    {
        try
        {
            if (id <= 0)
                return BadRequest("Invalid TYFCB ID");

            if (dto == null || string.IsNullOrWhiteSpace(dto.Status))
                return BadRequest("Status is required");

            var tyfcb = await _context.TYFCB.FindAsync(id);
            if (tyfcb == null)
                return NotFound($"TYFCB record with ID {id} not found");

            // Update status exactly as provided
            tyfcb.Status = dto.Status.Trim();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Status updated successfully",
                id = tyfcb.Id,
                status = tyfcb.Status
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error updating TYFCB status",
                error = ex.Message
            });
        }
    }

    // DTO (keep this at bottom of controller or in separate file)
    public class UpdateTYFCBStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }
    // POST: api/TYFCB
    [HttpPost]
    public async Task<ActionResult<TYFCB>> CreateTYFCB([FromBody] CreateTYFCBDto dto)
    {
        try
        {
            if (dto == null)
                return BadRequest("Request body cannot be empty");

            if (dto.GivenByMemberId <= 0)
                return BadRequest("GivenByMemberId must be a valid member ID");

            if (dto.ReceivedByMemberId <= 0)
                return BadRequest("ReceivedByMemberId must be a valid member ID");

            if (dto.Amount.HasValue && dto.Amount < 0)
                return BadRequest("Amount cannot be negative");

            // Fetch the GivenByMember to get SubCompanyId and validate existence
            var givenByMember = await _context.Members.FindAsync(dto.GivenByMemberId);
            if (givenByMember == null)
                return BadRequest($"Member with ID {dto.GivenByMemberId} not found");

            // Fetch the ReceivedByMember just for validation (optional: also get their SubCompanyId if needed later)
            var receivedByMember = await _context.Members.FindAsync(dto.ReceivedByMemberId);
            if (receivedByMember == null)
                return BadRequest($"Member with ID {dto.ReceivedByMemberId} not found");

            var tyfcb = new TYFCB
            {
                GivenByMemberId = dto.GivenByMemberId,
                ReceivedByMemberId = dto.ReceivedByMemberId,
                VisitDate = dto.VisitDate ?? DateTime.Now,
                BusinessVisited = dto.BusinessVisited,
                Notes = dto.Notes,
                Rating = dto.Rating,
                Amount = dto.Amount,
                Status = "Pending",
                CreatedDate = DateTime.Now,
                SubCompanyId = givenByMember.SubCompanyId // ✅ Set SubCompanyId from GivenByMember
            };

            _context.TYFCB.Add(tyfcb);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTYFCB), new { id = tyfcb.Id }, tyfcb);
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
                message = "Error creating TYFCB record",
                error = ex.Message
            });
        }
    }

    // ✅ Correct DTO
    public class CreateTYFCBDto
    {
        public int GivenByMemberId { get; set; }
        public int ReceivedByMemberId { get; set; }
        public DateTime? VisitDate { get; set; }
        public string? BusinessVisited { get; set; }
        public string? Notes { get; set; }
        public int? Rating { get; set; }
        public decimal? Amount { get; set; } // ✅ decimal?, not string
    }
    // PUT: api/TYFCB/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTYFCB(int id, [FromBody] UpdateTYFCBDto dto)
    {
        try
        {
            var tyfcb = await _context.TYFCB.FindAsync(id);
            if (tyfcb == null)
            {
                return NotFound();
            }

            tyfcb.BusinessVisited = dto.BusinessVisited ?? tyfcb.BusinessVisited;
            tyfcb.Notes = dto.Notes ?? tyfcb.Notes;
            tyfcb.Rating = dto.Rating ?? tyfcb.Rating;
            tyfcb.VisitDate = dto.VisitDate ?? tyfcb.VisitDate;

            _context.TYFCB.Update(tyfcb);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating TYFCB record", error = ex.Message });
        }
    }
    [HttpGet("report")]
    public async Task<ActionResult<object>> GetTYFCBReport(
     [FromQuery] DateTime? fromDate = null,
     [FromQuery] DateTime? toDate = null,
     [FromQuery] string? period = "daily",
     [FromQuery] int? memberId = null,
     [FromQuery] int? adminMemberId = null)
    {
        try
        {
            // 🔹 Use business timezone (e.g., India Standard Time for Chennai)
            var appTimeZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
            var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, appTimeZone).Date;

            DateTime startDate, endDate;

            // Determine date range
            if (fromDate.HasValue || toDate.HasValue)
            {
                // Keep your existing fallback: if fromDate missing, go back 10 years
                startDate = fromDate?.Date ?? nowLocal.AddYears(-10);
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

            // 🔹 Extend endDate to end of the day for inclusive filtering
            var queryEndDate = endDate.Date.AddDays(1).AddTicks(-1); // e.g., 2026-01-30 23:59:59.9999999

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

            // 🔑 Step 2: Handle memberId — validate and optionally restrict by SubCompany
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
            var query = _context.TYFCB
                .Include(t => t.GivenByMember)
                .Include(t => t.ReceivedByMember)
                .Where(t => t.VisitDate >= startDate && t.VisitDate <= queryEndDate);

            // 🔑 Apply filters
            if (adminMemberId.HasValue && memberId.HasValue)
            {
                // Admin + specific member in same company
                query = query.Where(t =>
                    (t.GivenByMemberId == memberId.Value || t.ReceivedByMemberId == memberId.Value) &&
                    t.SubCompanyId == targetSubCompanyId.Value);
            }
            else if (adminMemberId.HasValue)
            {
                // Admin view: all in company
                query = query.Where(t => t.SubCompanyId == targetSubCompanyId.Value);
            }
            else if (memberId.HasValue)
            {
                // Member view: no company restriction
                query = query.Where(t =>
                    t.GivenByMemberId == memberId.Value ||
                    t.ReceivedByMemberId == memberId.Value);
            }
            // else: global view (no filters)

            // Execute query
            var tyfcbsFromDb = await query
                .OrderByDescending(t => t.VisitDate)
                .ToListAsync();

            // Project in memory
            var tyfcbs = tyfcbsFromDb.Select(t => new
            {
                t.Id,
                GivenByMemberId = t.GivenByMemberId,
                GivenByMemberName = t.GivenByMember?.Name ?? "Unknown",
                ReceivedByMemberId = t.ReceivedByMemberId,
                ReceivedByMemberName = t.ReceivedByMember?.Name ?? "Unknown",
                VisitDate = t.VisitDate,
                t.BusinessVisited,
                t.Amount,
                t.Notes,
                t.Status,
                t.Rating,
                SubCompanyId = t.SubCompanyId ??
                              t.GivenByMember?.SubCompanyId ??
                              t.ReceivedByMember?.SubCompanyId,
                t.CreatedDate
            }).ToList();

            return Ok(new
            {
                fromDate = startDate,
                toDate = endDate,
                period = period?.ToLowerInvariant(),
                memberId = memberId,
                adminMemberId = adminMemberId,
                totalRecords = tyfcbs.Count,
                data = tyfcbs
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching TYFCB report", error = ex.Message });
        }
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTYFCB(int id)
    {
        try
        {
            var tyfcb = await _context.TYFCB.FindAsync(id);
            if (tyfcb == null)
            {
                return NotFound();
            }

            _context.TYFCB.Remove(tyfcb);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting TYFCB record", error = ex.Message });
        }
    }
}

// DTOs
public class CreateTYFCBDto
{
    public int GivenByMemberId { get; set; }
    public int ReceivedByMemberId { get; set; }
    public DateTime? VisitDate { get; set; }
    public string? BusinessVisited { get; set; }
    public string? Notes { get; set; }
    public int? Rating { get; set; }
}

public class UpdateTYFCBDto
{
    public DateTime? VisitDate { get; set; }
    public string? BusinessVisited { get; set; }
    public string? Notes { get; set; }
    public int? Rating { get; set; }
}
