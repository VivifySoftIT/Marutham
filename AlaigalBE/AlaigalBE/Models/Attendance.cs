using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models;

[Table("Attendance")]
public class Attendance
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int MemberId { get; set; }
    public int? SubCompanyId { get; set; }
    [Required]
    public DateTime AttendanceDate { get; set; }
    
    public TimeSpan? CheckInTime { get; set; }
    
    public TimeSpan? CheckOutTime { get; set; }
    public int? MeetingId { get; set; }
    [MaxLength(50)]
    public string Status { get; set; } = "Present"; // Present, Absent, Late, Leave
    
    [MaxLength(500)]
    public string? Notes { get; set; }
    
    [MaxLength(50)]
    public string? Batch { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    [MaxLength(100)]
    public string? CreatedBy { get; set; }
    
    public DateTime? CreatedDate { get; set; } = DateTime.UtcNow;
    
    [MaxLength(100)]
    public string? UpdatedBy { get; set; }
    
    public DateTime? UpdatedDate { get; set; }
    
    // Navigation property
    [ForeignKey("MemberId")]
    public virtual Member? Member { get; set; }
}
