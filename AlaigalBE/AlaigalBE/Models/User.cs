using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models;

[Table("Users")]
public class User
{
    [Key]
    public int Id { get; set; }
    
    [MaxLength(100)]
    public string? Username { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? Email { get; set; } = string.Empty;
    
    public string PasswordHash { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? FullName { get; set; }
    
    [MaxLength(15)]
    public string? Phone { get; set; }
    
    [MaxLength(50)]
    public string? Role { get; set; } = "Admin"; // Admin, Staff, Manager
    
    [MaxLength(500)]
    public string? ProfileImage { get; set; }
    
    public DateTime? LastLogin { get; set; }
    
    public string? ResetToken { get; set; }
    
    public DateTime? ResetTokenExpiry { get; set; }
    
    public bool IsActive { get; set; } = true;
    public int? MemberId { get; set; }
    [MaxLength(100)]
    public string? CreatedBy { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    [MaxLength(100)]
    public string? UpdatedBy { get; set; }
    
    public DateTime? UpdatedDate { get; set; }
}
