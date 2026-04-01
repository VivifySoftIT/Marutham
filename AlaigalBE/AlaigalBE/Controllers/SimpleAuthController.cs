using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using Alaigal.Data;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class SimpleAuthController : ControllerBase
{
    private readonly AlaigalRefContext _context;

    public SimpleAuthController(AlaigalRefContext context)
    {
        _context = context;
    }

    // POST: api/SimpleAuth/login
    [HttpPost("login")]
    public async Task<ActionResult<object>> Login([FromBody] SimpleLoginRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Username and password are required" });

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

            if (user == null)
                return Unauthorized(new { message = "Invalid username or password" });

            // ✅ Plain text comparison for all users
            bool passwordValid = request.Password == user.PasswordHash;

            if (!passwordValid)
                return Unauthorized(new { message = "Invalid username or password" });

            // Update last login
            user.LastLogin = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Create simple token (base64 encoded user info + timestamp)
            var tokenData = $"{user.Id}:{user.Username}:{DateTime.UtcNow.Ticks}";
            var token = Convert.ToBase64String(Encoding.UTF8.GetBytes(tokenData));

            // Return success
            return Ok(new
            {
                token = token,
                user = new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    fullName = user.FullName,
                    role = user.Role,
                    phone = user.Phone
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Login error: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");

            return StatusCode(500, new
            {
                message = "An error occurred during login",
                error = ex.Message,
                innerError = ex.InnerException?.Message
            });
        }
    }

    private string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }
}

public class SimpleLoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
