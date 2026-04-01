using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Alaigal.Data;
using Alaigal.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly AlaigalRefContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(AlaigalRefContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    // AuthController.cs - Update the Login method
    [HttpPost("login")]
    public async Task<ActionResult<object>> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

        if (user == null)
        {
            return Unauthorized(new { message = "Invalid username or password" });
        }

        // ✅ Plain text password check for ALL roles
        if (request.Password != user.PasswordHash)
        {
            return Unauthorized(new { message = "Invalid username or password" });
        }

        user.LastLogin = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user);

        // Get member details if linked
        Member member = null;
        if (user.MemberId.HasValue)
        {
            member = await _context.Members.FirstOrDefaultAsync(m => m.Id == user.MemberId.Value && m.IsActive);
        }

        return Ok(new
        {
            token,
            user = new
            {
                user.Id,
                user.Username,
                user.Email,
                user.FullName,
                user.Role,
                user.Phone,
                user.MemberId,
                MemberDetails = member != null ? new
                {
                    member.Id,
                    member.Name,
                    member.Email,
                    member.Phone,
                    member.MemberId
                } : null
            }
        });
    }

    // POST: api/Auth/register
    [HttpPost("register")]
    public async Task<ActionResult<User>> Register([FromBody] RegisterRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Username == request.Username))
        {
            return BadRequest(new { message = "Username already exists" });
        }

        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return BadRequest(new { message = "Email already exists" });
        }

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            FullName = request.FullName,
            Phone = request.Phone,
            PasswordHash = HashPassword(request.Password),
            Role = "Admin",
            CreatedDate = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "User registered successfully" });
    }

    // POST: api/Auth/forgot-password - UPDATED TO SEND OTP
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);

        // Always return success to avoid email enumeration
        if (user == null)
        {
            return Ok(new { message = "If the email exists, a verification code will be sent." });
        }

        // Generate 6-digit OTP
        var otp = new Random().Next(100000, 999999).ToString();

        // Store OTP as reset token with 10 minute expiry
        user.ResetToken = otp;
        user.ResetTokenExpiry = DateTime.UtcNow.AddMinutes(10);
        await _context.SaveChangesAsync();

        // Load SMTP settings
        var smtpSettings = _configuration.GetSection("SmtpSettings");
        var host = smtpSettings["Host"];
        var port = int.Parse(smtpSettings["Port"]);
        var username = smtpSettings["Username"];
        var password = smtpSettings["Password"];
        var enableSsl = bool.Parse(smtpSettings["EnableSsl"]);
        var fromEmail = smtpSettings["FromEmail"];
        var fromName = smtpSettings["FromName"];

        try
        {
            using var client = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(username, password),
                EnableSsl = enableSsl
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = "Password Reset Verification Code",
                Body = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                        <h2 style='color: #4A90E2;'>Password Reset Request</h2>
                        <p>Hello,</p>
                        <p>We received a request to reset your password. Use the verification code below:</p>
                        <div style='background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;'>
                            <h1 style='color: #4A90E2; letter-spacing: 8px; margin: 0; font-size: 36px;'>{otp}</h1>
                        </div>
                        <p><strong>This code will expire in 10 minutes.</strong></p>
                        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
                        <br/>
                        <p>Best regards,<br/>Alaigal Team</p>
                        <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;'/>
                        <p style='color: #666; font-size: 12px;'>This is an automated message, please do not reply.</p>
                    </div>
                ",
                IsBodyHtml = true
            };
            mailMessage.To.Add(user.Email);
            await client.SendMailAsync(mailMessage);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to send email: {ex.Message}");
            return StatusCode(500, new { message = "Failed to send verification code. Please try again later." });
        }

        return Ok(new { message = "Verification code has been sent to your email." });
    }

    // POST: api/Auth/verify-otp - NEW ENDPOINT
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOTP([FromBody] VerifyOTPRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u =>
            u.Email == request.Email &&
            u.ResetToken == request.Otp &&
            u.ResetTokenExpiry > DateTime.UtcNow &&
            u.IsActive);

        if (user == null)
        {
            return BadRequest(new { message = "Invalid or expired verification code." });
        }

        // Generate a new secure token for password reset
        var resetToken = GenerateResetToken();
        user.ResetToken = resetToken;
        user.ResetTokenExpiry = DateTime.UtcNow.AddHours(1); // Extended time for password reset
        await _context.SaveChangesAsync();

        return Ok(new { token = resetToken, message = "Code verified successfully." });
    }

    // POST: api/Auth/reset-password
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.ResetToken == request.Token && u.IsActive);

        if (user == null || user.ResetTokenExpiry < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invalid or expired reset token" });
        }

        // Store password as plain text (not hashed)
        user.PasswordHash = request.NewPassword;
        user.ResetToken = null;
        user.ResetTokenExpiry = null;
        user.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Password reset successfully" });
    }

    // POST: api/Auth/change-password
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var user = await _context.Users.FindAsync(request.UserId);

        if (user == null || !VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Current password is incorrect" });
        }

        user.PasswordHash = HashPassword(request.NewPassword);
        user.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Password changed successfully" });
    }

    // POST: api/Auth/change-password-by-username
    [HttpPost("change-password-by-username")]
    public async Task<IActionResult> ChangePasswordByUsername([FromBody] ChangePasswordByUsernameRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

        if (user == null)
        {
            return BadRequest(new { message = "User not found" });
        }

        // Verify current password based on role
        bool passwordValid = false;
        if (user.Role == "User")
        {
            // Compares PLAIN TEXT: input == stored value
            passwordValid = (request.CurrentPassword == user.PasswordHash);
        }
        else
        {
            // Compares HASHED: SHA256(input) == stored hash
            passwordValid = VerifyPassword(request.CurrentPassword, user.PasswordHash);
        }

        if (!passwordValid)
        {
            return BadRequest(new { message = "Current password is incorrect" });
        }

        // Store new password based on role
        if (user.Role == "User")
        {
            // For User role, store as plain text
            user.PasswordHash = request.NewPassword;
        }
        else
        {
            // For Admin role, hash it
            user.PasswordHash = HashPassword(request.NewPassword);
        }

        user.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Password changed successfully" });
    }

    private string GenerateJwtToken(User user)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"]!));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    private bool VerifyPassword(string password, string hash)
    {
        return HashPassword(password) == hash;
    }

    private string GenerateResetToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Phone { get; set; }
}

public class ForgotPasswordRequest
{
    public string Email { get; set; } = string.Empty;
}

public class VerifyOTPRequest
{
    public string Email { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    public int UserId { get; set; }
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class ChangePasswordByUsernameRequest
{
    public string Username { get; set; } = string.Empty;
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
