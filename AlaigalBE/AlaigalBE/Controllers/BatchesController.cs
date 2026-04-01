using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Alaigal.Data;
using Alaigal.Models;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class BatchesController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    public BatchesController(AlaigalRefContext context)
    {
        _context = context;
    }

    // GET: api/Batches
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Batch>>> GetBatches()
    {
        return await _context.Batches
            .Where(b => b.IsActive)
            .OrderBy(b => b.StartTime)
            .ToListAsync();
    }

    // GET: api/Batches/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Batch>> GetBatch(int id)
    {
        var batch = await _context.Batches.FindAsync(id);

        if (batch == null)
        {
            return NotFound();
        }

        return batch;
    }

    // POST: api/Batches
    [HttpPost]
    public async Task<ActionResult<Batch>> CreateBatch(Batch batch)
    {
        batch.CreatedDate = DateTime.UtcNow;
        _context.Batches.Add(batch);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBatch), new { id = batch.Id }, batch);
    }

    // PUT: api/Batches/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBatch(int id, Batch batch)
    {
        if (id != batch.Id)
        {
            return BadRequest();
        }

        batch.UpdatedDate = DateTime.UtcNow;
        _context.Entry(batch).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!BatchExists(id))
            {
                return NotFound();
            }
            throw;
        }

        return NoContent();
    }

    // DELETE: api/Batches/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBatch(int id)
    {
        var batch = await _context.Batches.FindAsync(id);
        if (batch == null)
        {
            return NotFound();
        }

        batch.IsActive = false;
        batch.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool BatchExists(int id)
    {
        return _context.Batches.Any(e => e.Id == id);
    }
}
