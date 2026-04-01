using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models;

[Table("Batches")]
public class Batch
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string BatchName { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string? BatchCode { get; set; }
    
    public TimeSpan? StartTime { get; set; }
    
    public TimeSpan? EndTime { get; set; }
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public int? Capacity { get; set; }
    
    public int CurrentMembers { get; set; } = 0;
    
    [MaxLength(100)]
    public string? Instructor { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    [MaxLength(100)]
    public string? CreatedBy { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    [MaxLength(100)]
    public string? UpdatedBy { get; set; }
    
    public DateTime? UpdatedDate { get; set; }
}
