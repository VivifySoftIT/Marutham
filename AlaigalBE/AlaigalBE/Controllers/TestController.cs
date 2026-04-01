using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Alaigal.Data;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TestController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    public TestController(AlaigalRefContext context)
    {
        _context = context;
    }

    // GET: api/Test
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { 
            message = "API is working!", 
            timestamp = DateTime.UtcNow 
        });
    }

    // GET: api/Test/database
    [HttpGet("database")]
    public async Task<IActionResult> TestDatabase()
    {
        try
        {
            var userCount = await _context.Users.CountAsync();
            return Ok(new { 
                message = "Database connection successful", 
                userCount = userCount 
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { 
                message = "Database error", 
                error = ex.Message,
                innerError = ex.InnerException?.Message
            });
        }
    }
    // PUT: api/Members/UpdatePasswordByMemberId
    [HttpPut("UpdatePasswordByMemberId")]
    public async Task<IActionResult> UpdatePasswordByMemberId([FromBody] UpdatePasswordDto model)
    {
        if (model == null || model.MemberId <= 0 || string.IsNullOrWhiteSpace(model.NewPassword))
        {
            return BadRequest(new { message = "Invalid request data" });
        }

        // Find user by MemberId
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.MemberId == model.MemberId && u.IsActive);

        if (user == null)
        {
            return NotFound(new { message = "User not found for this member" });
        }

        // Update password
        user.PasswordHash = HashPassword(model.NewPassword);
        user.UpdatedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Password updated successfully" });
    }
    public class UpdatePasswordDto
    {
        public int MemberId { get; set; }
        public string NewPassword { get; set; }
    }

    // GET: api/Test/users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        try
        {
            var users = await _context.Users
                .Select(u => new { 
                    u.Id, 
                    u.Username, 
                    u.Email, 
                    u.Role, 
                    u.IsActive 
                })
                .ToListAsync();
            
            return Ok(users);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { 
                message = "Error fetching users", 
                error = ex.Message,
                innerError = ex.InnerException?.Message
            });
        }
    }

    // POST: api/Test/login
    [HttpPost("login")]
    public async Task<IActionResult> TestLogin([FromBody] TestLoginRequest request)
    {
        try
        {
            // Step 1: Check if user exists
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null)
            {
                return Ok(new { 
                    success = false, 
                    message = "User not found",
                    username = request.Username
                });
            }

            // Step 2: Hash the incoming password
            var hashedPassword = HashPassword(request.Password);

            // Step 3: Compare hashes
            var passwordMatch = hashedPassword == user.PasswordHash;

            return Ok(new { 
                success = passwordMatch,
                message = passwordMatch ? "Login successful" : "Password incorrect",
                username = user.Username,
                storedHash = user.PasswordHash,
                providedHash = hashedPassword,
                hashesMatch = passwordMatch
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { 
                message = "Login test error", 
                error = ex.Message,
                innerError = ex.InnerException?.Message,
                stackTrace = ex.StackTrace
            });
        }
    }

    private string HashPassword(string password)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashedBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }
}

public class TestLoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
