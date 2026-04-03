using Alaigal.Data;
using Alaigal.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlaigalBE.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SubCompaniesController : ControllerBase
    {
        private readonly AlaigalRefContext _context;

        public SubCompaniesController(AlaigalRefContext context)
        {
            _context = context;
        }

        // GET: api/SubCompanies
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SubCompany>>> GetSubCompanies([FromQuery] int? mainCompanyId = null)
        {
            var query = _context.SubCompanies
                .Include(sc => sc.MainCompany)
                .Where(sc => sc.IsActive);

            if (mainCompanyId.HasValue)
            {
                query = query.Where(sc => sc.MainCompanyId == mainCompanyId.Value);
            }

            return await query
                .OrderBy(sc => sc.SubCompanyName)
                .ToListAsync();
        }

        // GET: api/SubCompanies/5
        [HttpGet("{id}")]
        public async Task<ActionResult<SubCompany>> GetSubCompany(int id)
        {
            var subCompany = await _context.SubCompanies
                .Include(sc => sc.MainCompany)
                .FirstOrDefaultAsync(sc => sc.Id == id && sc.IsActive);

            if (subCompany == null)
            {
                return NotFound();
            }

            return subCompany;
        }

        // GET: api/SubCompanies/maincompany/5
        [HttpGet("maincompany/{mainCompanyId}")]
        public async Task<ActionResult<IEnumerable<SubCompany>>> GetSubCompaniesByMainCompany(int mainCompanyId)
        {
            return await _context.SubCompanies
                .Include(sc => sc.MainCompany)
                .Where(sc => sc.MainCompanyId == mainCompanyId && sc.IsActive)
                .OrderBy(sc => sc.SubCompanyName)
                .ToListAsync();
        }

        // GET: api/SubCompanies/code/BNI/maincompany/1
        [HttpGet("code/{code}/maincompany/{mainCompanyId}")]
        public async Task<ActionResult<SubCompany>> GetSubCompanyByCode(string code, int mainCompanyId)
        {
            var subCompany = await _context.SubCompanies
                .Include(sc => sc.MainCompany)
                .FirstOrDefaultAsync(sc => sc.SubCompanyCode == code && sc.MainCompanyId == mainCompanyId && sc.IsActive);

            if (subCompany == null)
            {
                return NotFound();
            }

            return subCompany;
        }

        // PUT: api/SubCompanies/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutSubCompany(int id, SubCompany subCompany)
        {
            if (id != subCompany.Id)
            {
                return BadRequest();
            }

            // Validate main company exists
            var mainCompanyExists = await _context.MainCompanies.AnyAsync(mc => mc.Id == subCompany.MainCompanyId && mc.IsActive);
            if (!mainCompanyExists)
            {
                return BadRequest("Invalid main company ID");
            }

            subCompany.ModifiedDate = DateTime.Now;
            _context.Entry(subCompany).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!SubCompanyExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/SubCompanies
        [HttpPost]
        public async Task<ActionResult<SubCompany>> PostSubCompany(SubCompany subCompany)
        {
            // Validate main company exists
            var mainCompanyExists = await _context.MainCompanies.AnyAsync(mc => mc.Id == subCompany.MainCompanyId && mc.IsActive);
            if (!mainCompanyExists)
            {
                return BadRequest("Invalid main company ID");
            }

            subCompany.CreatedDate = DateTime.Now;
            _context.SubCompanies.Add(subCompany);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetSubCompany", new { id = subCompany.Id }, subCompany);
        }

        // DELETE: api/SubCompanies/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSubCompany(int id)
        {
            var subCompany = await _context.SubCompanies.FindAsync(id);
            if (subCompany == null)
            {
                return NotFound();
            }

            // Check if sub-company has members
            var hasMembersInSubCompany = await _context.Members.AnyAsync(m => m.SubCompanyId == id);
            if (hasMembersInSubCompany)
            {
                return BadRequest("Cannot delete sub-company that has members assigned to it");
            }

            // Soft delete
            subCompany.IsActive = false;
            subCompany.ModifiedDate = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/SubCompanies/{id}/stats
        [HttpGet("{id}/stats")]
        public async Task<ActionResult<object>> GetSubCompanyStats(int id)
        {
            var subCompany = await _context.SubCompanies.FindAsync(id);
            if (subCompany == null)
            {
                return NotFound();
            }

            var stats = new
            {
                TotalMembers = await _context.Members.CountAsync(m => m.SubCompanyId == id),
                ActiveMembers = await _context.Members.CountAsync(m => m.SubCompanyId == id && m.Status == "Active"),
                // Add more stats as needed
            };

            return stats;
        }

        // GET: api/SubCompanies/{id}/members
        [HttpGet("{id}/members")]
        public async Task<ActionResult<IEnumerable<Member>>> GetSubCompanyMembers(int id)
        {
            var subCompany = await _context.SubCompanies.FindAsync(id);
            if (subCompany == null)
            {
                return NotFound();
            }

            var members = await _context.Members
                .Where(m => m.SubCompanyId == id)
                .OrderBy(m => m.Name)
                .ToListAsync();

            return members;
        }

        // PUT: api/SubCompanies/{id}/fee  — Admin sets monthly fee for this sub-company
        [HttpPut("{id}/fee")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous]
        public async Task<IActionResult> SetMonthlyFee(int id, [FromBody] SetFeeDto dto)
        {
            var subCompany = await _context.SubCompanies.FindAsync(id);
            if (subCompany == null || !subCompany.IsActive)
                return NotFound(new { message = "Sub-company not found" });

            subCompany.MonthlyFee = dto.MonthlyFee;
            subCompany.ModifiedDate = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Monthly fee updated", monthlyFee = subCompany.MonthlyFee });
        }

        // POST: api/SubCompanies/{id}/fee  — IIS-safe alternative to PUT
        [HttpPost("{id}/fee")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous]
        public async Task<IActionResult> SetMonthlyFeePost(int id, [FromBody] SetFeeDto dto)
        {
            var subCompany = await _context.SubCompanies.FindAsync(id);
            if (subCompany == null || !subCompany.IsActive)
                return NotFound(new { message = "Sub-company not found" });

            subCompany.MonthlyFee = dto.MonthlyFee;
            subCompany.ModifiedDate = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Monthly fee updated", monthlyFee = subCompany.MonthlyFee });
        }

        private bool SubCompanyExists(int id)
        {
            return _context.SubCompanies.Any(e => e.Id == id);
        }
    }

    public class SetFeeDto
    {
        public decimal MonthlyFee { get; set; }
    }
}