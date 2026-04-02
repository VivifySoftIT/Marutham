using Microsoft.AspNetCore.Mvc;

namespace AlaigalBE.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ThirukkuralController : ControllerBase
{
    // Returns the daily Thirukkural based on day-of-year (same for all users all day)
    [HttpGet("daily")]
    public IActionResult GetDailyKural()
    {
        var dayOfYear = DateTime.UtcNow.DayOfYear; // 1–366
        var index = (dayOfYear - 1) % ThirukkuralData.Kurals.Count;
        var kural = ThirukkuralData.Kurals[index];
        return Ok(kural);
    }

    // Optional: get by kural number
    [HttpGet("{number:int}")]
    public IActionResult GetByNumber(int number)
    {
        var kural = ThirukkuralData.Kurals.FirstOrDefault(k => k.Number == number);
        if (kural == null) return NotFound();
        return Ok(kural);
    }
}

public record KuralDto(int Number, string Tamil, string Meaning);
