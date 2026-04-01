using Alaigal.Data;
using Alaigal.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlaigalBE.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MainCompaniesController : ControllerBase
    {
        private readonly AlaigalRefContext _context;

        public MainCompaniesController(AlaigalRefContext context)
        {
            _context = context;
        }

        // GET: api/MainCompanies
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MainCompany>>> GetMainCompanies()
        {
            return await _context.MainCompanies
                .Where(c => c.IsActive)
                .Include(c => c.SubCompanies.Where(sc => sc.IsActive))
                .OrderBy(c => c.CompanyName)
                .ToListAsync();
        }

        // GET: api/MainCompanies/5
        [HttpGet("{id}")]
        public async Task<ActionResult<MainCompany>> GetMainCompany(int id)
        {
            var company = await _context.MainCompanies
                .Include(c => c.SubCompanies.Where(sc => sc.IsActive))
                .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

            if (company == null)
            {
                return NotFound();
            }

            return company;
        }

        // GET: api/MainCompanies/code/ALAIGAL
        [HttpGet("code/{code}")]
        public async Task<ActionResult<MainCompany>> GetMainCompanyByCode(string code)
        {
            var company = await _context.MainCompanies
                .Include(c => c.SubCompanies.Where(sc => sc.IsActive))
                .FirstOrDefaultAsync(c => c.CompanyCode == code && c.IsActive);

            if (company == null)
            {
                return NotFound();
            }

            return company;
        }

        // PUT: api/MainCompanies/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutMainCompany(int id, MainCompany company)
        {
            if (id != company.Id)
            {
                return BadRequest();
            }

            company.ModifiedDate = DateTime.Now;
            _context.Entry(company).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!MainCompanyExists(id))
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

        // POST: api/MainCompanies
        [HttpPost]
        public async Task<ActionResult<MainCompany>> PostMainCompany(MainCompany company)
        {
            company.CreatedDate = DateTime.Now;
            _context.MainCompanies.Add(company);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetMainCompany", new { id = company.Id }, company);
        }

        // DELETE: api/MainCompanies/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMainCompany(int id)
        {
            var company = await _context.MainCompanies.FindAsync(id);
            if (company == null)
            {
                return NotFound();
            }

            // Soft delete
            company.IsActive = false;
            company.ModifiedDate = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool MainCompanyExists(int id)
        {
            return _context.MainCompanies.Any(e => e.Id == id);
        }
    }
}