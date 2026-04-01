using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models;

[Table("Notices")]
public class Notice
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Message { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string NoticeType { get; set; } = "General"; // General, Urgent, Event, Announcement
    
    public DateTime? ScheduledDate { get; set; }
    
    public bool IsSent { get; set; } = false;
    
    public DateTime? SentDate { get; set; }
    
    [MaxLength(50)]
    public string? TargetAudience { get; set; } // All, Active, Specific
    
    public int? RecipientCount { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    [MaxLength(100)]
    public string? CreatedBy { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    [MaxLength(100)]
    public string? UpdatedBy { get; set; }
    
    public DateTime? UpdatedDate { get; set; }
}
