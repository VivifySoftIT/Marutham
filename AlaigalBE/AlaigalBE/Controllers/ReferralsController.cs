using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Alaigal.Data;
using Alaigal.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ReferralsController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    public ReferralsController(AlaigalRefContext context)
    {
        _context = context;
    }

    // GET: api/Referrals
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Referral>>> GetReferrals()
    {
        try
        {
            var referrals = await _context.Referrals
                .Include(r => r.GivenByMember)
                .Include(r => r.ReceivedByMember)
                .OrderByDescending(r => r.ReferralDate)
                .ToListAsync();
            return Ok(referrals);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching referrals", error = ex.Message });
        }
    }

    // GET: api/Referrals/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Referral>> GetReferral(int id)
    {
        var referral = await _context.Referrals
            .Include(r => r.GivenByMember)
            .Include(r => r.ReceivedByMember)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (referral == null)
        {
            return NotFound();
        }

        return referral;
    }

    // POST: api/Referrals
    // POST: api/Referrals
    [HttpPost]
    public async Task<ActionResult<Referral>> CreateReferral([FromBody] CreateReferralDto dto)
    {
        try
        {
            if (dto == null)
                return BadRequest("Request body cannot be empty");

            // Validate required fields
            if (dto.GivenByMemberId <= 0)
                return BadRequest("GivenByMemberId must be a valid member ID");

            if (dto.GivenToMemberId <= 0)
                return BadRequest("GivenToMemberId must be a valid member ID");

            if (string.IsNullOrWhiteSpace(dto.ReferralType))
                return BadRequest("ReferralType is required");

            if (string.IsNullOrWhiteSpace(dto.ReferralStatus))
                return BadRequest("ReferralStatus is required");

            // Fetch GivenByMember to validate and get SubCompanyId
            var givenByMember = await _context.Members
                .Where(m => m.Id == dto.GivenByMemberId)
                .Select(m => new { m.Id, m.SubCompanyId })
                .FirstOrDefaultAsync();

            if (givenByMember == null)
                return BadRequest($"GivenByMember with ID {dto.GivenByMemberId} not found");

            // Validate ReceivedByMember exists
            var receivedByMemberExists = await _context.Members
                .AnyAsync(m => m.Id == dto.GivenToMemberId);

            if (!receivedByMemberExists)
                return BadRequest($"ReceivedByMember with ID {dto.GivenToMemberId} not found");

            // Create the referral
            var referral = new Referral
            {
                ReferralCode = GenerateReferralCode(),
                GivenByMemberId = dto.GivenByMemberId,
                ReceivedByMemberId = dto.GivenToMemberId,
                ClientName = dto.ReferralNumber ?? string.Empty,
                ClientPhone = dto.Telephone ?? string.Empty,
                ClientEmail = dto.Email ?? string.Empty,
                BusinessType = dto.ReferralType ?? string.Empty,
                ReferralDate = DateTime.Now,
                Status = dto.Status ?? "Pending",
                Notes = $"Type: {dto.ReferralType}, Status: {dto.ReferralStatus}, " +
                        $"Comments: {(dto.Comments ?? string.Empty)}",
                CreatedDate = DateTime.Now,
                UpdatedDate = null,
                Revenue = null,
                SubCompanyId = givenByMember.SubCompanyId
            };

            _context.Referrals.Add(referral);

            // 🔁 Conditionally update the GivenByMember in Members table if ReferralType is "Inside"
            if (string.Equals(dto.ReferralType, "Inside", StringComparison.OrdinalIgnoreCase))
            {
                var memberToUpdate = await _context.Members
                    .FirstOrDefaultAsync(m => m.Id == dto.GivenByMemberId);

                if (memberToUpdate != null)
                {
                    // Update only if the incoming value is meaningful (not null/empty/whitespace)
                    if (!string.IsNullOrWhiteSpace(dto.ReferralNumber))
                        memberToUpdate.Business = dto.ReferralNumber.Trim();

                    if (!string.IsNullOrWhiteSpace(dto.Telephone))
                        memberToUpdate.Phone = dto.Telephone.Trim();

                    if (!string.IsNullOrWhiteSpace(dto.Email))
                        memberToUpdate.Email = dto.Email.Trim();

                    if (!string.IsNullOrWhiteSpace(dto.Address))
                        memberToUpdate.Address = dto.Address.Trim();

                    memberToUpdate.UpdatedDate = DateTime.Now;
                    // Optionally set UpdatedBy if you track who made the change
                    // memberToUpdate.UpdatedBy = ...;
                }
            }

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetReferral), new { id = referral.Id }, referral);
        }
        catch (DbUpdateException dbEx)
        {
            Console.WriteLine($"Database Error: {dbEx.Message}");
            Console.WriteLine($"Inner Exception: {dbEx.InnerException?.Message}");
            return StatusCode(500, new
            {
                message = "Database error creating referral",
                error = dbEx.InnerException?.Message ?? dbEx.Message
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"General Error: {ex.Message}");
            return StatusCode(500, new
            {
                message = "Error creating referral",
                error = ex.Message
            });
        }
    }
    // PUT: api/Referrals/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReferral(int id, [FromBody] UpdateReferralDto dto)
    {
        var referral = await _context.Referrals.FindAsync(id);
        if (referral == null)
        {
            return NotFound();
        }

        referral.Status = dto.Status ?? referral.Status;
        referral.Revenue = dto.Revenue ?? referral.Revenue;
        referral.Notes = dto.Notes ?? referral.Notes;
        referral.UpdatedDate = DateTime.Now;

        _context.Referrals.Update(referral);
        await _context.SaveChangesAsync();

        return NoContent();
    }
    // GET: api/Referrals/report
    [HttpGet("report")]
    public async Task<ActionResult<object>> GetReferralReport(
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

            // 🔹 Extend endDate to end of the day for inclusive filtering
            var queryEndDate = endDate.Date.AddDays(1).AddTicks(-1); // e.g., 2026-01-30 23:59:59.9999999

            // 🔑 Step 1: Handle adminMemberId — get SubCompanyId
            int? targetSubCompanyId = subCompanyId; // direct param takes base value
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
            var query = _context.Referrals
                .Include(r => r.GivenByMember)
                .Include(r => r.ReceivedByMember)
                .Where(r => r.ReferralDate >= startDate && r.ReferralDate <= queryEndDate);

            // 🔑 Apply filters
            if (adminMemberId.HasValue && memberId.HasValue)
            {
                query = query.Where(r =>
                    (r.GivenByMemberId == memberId.Value || r.ReceivedByMemberId == memberId.Value) &&
                    r.SubCompanyId == targetSubCompanyId.Value);
            }
            else if (adminMemberId.HasValue)
            {
                query = query.Where(r => r.SubCompanyId == targetSubCompanyId.Value);
            }
            else if (memberId.HasValue && targetSubCompanyId.HasValue)
            {
                query = query.Where(r =>
                    (r.GivenByMemberId == memberId.Value || r.ReceivedByMemberId == memberId.Value) &&
                    r.SubCompanyId == targetSubCompanyId.Value);
            }
            else if (memberId.HasValue)
            {
                query = query.Where(r =>
                    r.GivenByMemberId == memberId.Value ||
                    r.ReceivedByMemberId == memberId.Value);
            }
            else if (targetSubCompanyId.HasValue)
            {
                query = query.Where(r => r.SubCompanyId == targetSubCompanyId.Value);
            }

            // Execute query
            var referralsFromDb = await query
                .OrderByDescending(r => r.ReferralDate)
                .ToListAsync();

            // Project in memory
            var referrals = referralsFromDb.Select(r => new
            {
                r.Id,
                r.ReferralCode,
                GivenByMemberId = r.GivenByMemberId,
                GivenByMemberName = r.GivenByMember?.Name ?? "Unknown",
                ReceivedByMemberId = r.ReceivedByMemberId,
                ReceivedByMemberName = r.ReceivedByMember?.Name ?? "Unknown",
                r.ClientName,
                r.ClientPhone,
                r.ClientEmail,
                r.BusinessType,
                r.ReferralDate,
                r.Status,
                r.Revenue,
                r.Notes,
                SubCompanyId = r.SubCompanyId ??
                              r.GivenByMember?.SubCompanyId ??
                              r.ReceivedByMember?.SubCompanyId,
                r.CreatedDate,
                r.UpdatedDate
            }).ToList();

            return Ok(new
            {
                fromDate = startDate,
                toDate = endDate,
                period = period?.ToLowerInvariant(),
                memberId = memberId,
                adminMemberId = adminMemberId,
                totalRecords = referrals.Count,
                data = referrals
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching referral report", error = ex.Message });
        }
    }
    // DELETE: api/Referrals/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReferral(int id)
    {
        var referral = await _context.Referrals.FindAsync(id);
        if (referral == null)
        {
            return NotFound();
        }

        _context.Referrals.Remove(referral);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private string GenerateReferralCode()
    {
        return $"REF-{DateTime.Now:yyyyMMddHHmmss}-{new Random().Next(1000, 9999)}";
    }

    // Allowed statuses
    private static readonly HashSet<string> AllowedStatuses =
        new(StringComparer.OrdinalIgnoreCase)
        {
        "Confirmed", "Rejected"
        };
    // POST: api/Referrals/status
    [HttpPost("status")]
    public async Task<IActionResult> SetReferralStatus([FromBody] UpdateReferralStatusDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // ✅ Validate status value
        if (!AllowedStatuses.Contains(dto.Status))
        {
            return BadRequest(new
            {
                error = "Invalid status.",
                allowedValues = new[] { "Confirmed", "Rejected" }
            });
        }

        var referral = await _context.Referrals.FindAsync(dto.Id);
        if (referral == null)
        {
            return NotFound($"Referral with ID {dto.Id} not found.");
        }

        // Store the string directly
        referral.Status = dto.Status; // e.g., "Confirmed" or "Rejected"
        referral.UpdatedDate = DateTime.Now;

        try
        {
            _context.Referrals.Update(referral);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Id = referral.Id,
                Status = referral.Status,
                UpdatedDate = referral.UpdatedDate
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to update referral status", error = ex.Message });
        }
    }
    public class UpdateReferralStatusDto
    {
        [Required(ErrorMessage = "Referral ID is required.")]
        public int Id { get; set; }

        [Required(ErrorMessage = "Status is required.")]
        public string Status { get; set; } = string.Empty;
    }

    public class CreateReferralDto
    {
        [Required]
        public int GivenByMemberId { get; set; }

        [Required]
        public int GivenToMemberId { get; set; }
        public string? Address { get; set; }

        [Required]
        public string ReferralType { get; set; } = string.Empty;

        public string ReferralStatus { get; set; } = string.Empty;

        public string ReferralNumber { get; set; } = string.Empty;

        public string? Telephone { get; set; }

        [EmailAddress]
        public string? Email { get; set; }


        public string? Comments { get; set; }

        public string? Status { get; set; }
    }

    public class UpdateReferralDto
    {
        public string? Status { get; set; }
        public decimal? Revenue { get; set; }
        public string? Notes { get; set; }
    }
}