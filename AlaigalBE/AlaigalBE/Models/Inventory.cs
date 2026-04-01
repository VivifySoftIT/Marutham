using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models;

[Table("Inventory")]
public class Inventory
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string ItemName { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string? ItemCode { get; set; }
    
    [MaxLength(100)]
    public string? Category { get; set; }
    
    public int Quantity { get; set; } = 0;
    
    public int? MinimumStock { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? UnitPrice { get; set; }
    
    [MaxLength(50)]
    public string? Unit { get; set; }
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [MaxLength(100)]
    public string? Supplier { get; set; }
    
    public DateTime? LastRestockDate { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    [MaxLength(100)]
    public string? CreatedBy { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    [MaxLength(100)]
    public string? UpdatedBy { get; set; }
    
    public DateTime? UpdatedDate { get; set; }
}
