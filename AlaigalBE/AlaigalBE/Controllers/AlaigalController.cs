using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Alaigal.Data;
using Alaigal.Models;
using System.ComponentModel.DataAnnotations;

namespace Alaigal.Controllers;

[ApiController]
[Route("api/[controller]/[action]")]
public class MembersController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    // ✅ FIXED constructor
    public MembersController(AlaigalRefContext context)
    {
        _context = context;
    }

    // POST: api/members/AddMember
    [HttpPost]
    public async Task<IActionResult> AddMember([FromBody] MemberslistDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var member = new Memberslist
            {
                Membername = dto.Membername.Trim(),
                MobileNum = dto.MobileNum,
                Joiningdate = dto.Joiningdate,
                Business = dto.Business,
                ReferenceId = dto.ReferenceId,
                IsActive = true,
                Crtby = dto.Crtby,
                Updatedby = dto.Crtby,
                Crtdate = DateTime.UtcNow,
                Updateddate = DateTime.UtcNow
            };

            _context.Memberslist.Add(member);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Member added successfully",
                memberId = member.Id
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error while adding member",
                error = ex.Message
            });
        }
    }

    [HttpGet]
    [ActionName("GetActiveMembers")]
    public async Task<IActionResult> GetActiveMembers()
    {
        try
        {
            var activeMembers = await _context.Memberslist
                .Where(m => m.IsActive)
                .Select(m => new
                {
                    m.Id,
                    m.Membername,
                    m.MobileNum,
                    m.Joiningdate,
                    m.Business,
                    m.ReferenceId,
                    m.IsActive,
                    m.Crtby,
                    m.Updatedby,
                    m.Crtdate,
                    m.Updateddate
                })
                .ToListAsync();

            return Ok(new
            {
                message = "Active members retrieved successfully",
                data = activeMembers
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error retrieving active members",
                error = ex.Message
            });
        }
    }
    [HttpPost]
    [ActionName("DeleteMember")]
    public async Task<IActionResult> DeleteMember([FromBody] DeleteMemberRequest request)
    {
        try
        {
            if (request?.Id <= 0)
            {
                return BadRequest(new
                {
                    message = "Invalid member ID.",
                    error = "ID must be a positive integer."
                });
            }

            var member = await _context.Memberslist
                .FirstOrDefaultAsync(m => m.Id == request.Id);

            if (member == null)
            {
                return NotFound(new
                {
                    message = $"Member with ID {request.Id} not found.",
                    error = "Member does not exist."
                });
            }

            if (!member.IsActive)
            {
                return BadRequest(new
                {
                    message = $"Member with ID {request.Id} is already inactive.",
                    error = "Cannot soft-delete an already inactive member."
                });
            }

            // ✅ Set UpdatedBy internally (example: from authenticated user or system)
            // Replace this with real user context when available (e.g., User.Identity.Name)
            var updatedBy = "Admin"; // ← CHANGE THIS as per your auth logic

            member.IsActive = false;
            member.Updatedby = updatedBy;
            member.Updateddate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Member soft-deleted successfully.",
                data = new
                {
                    id = member.Id,
                    updatedBy = member.Updatedby,
                    updatedDate = member.Updateddate
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "An error occurred while deleting the member.",
                error = ex.InnerException?.Message ?? ex.Message
            });
        }
    }
}
