using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Alaigal.Models;

[Table("Payments")]
public class Payment
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int MemberId { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    public int? PaymentForYear { get; set; } // Must be string to match sample
    public string PaymentForMonth { get; set; } = string.Empty;

    public DateTime PaymentStartDate { get; set; }
    public DateTime PaymentEndDate { get; set; }

    [Required]
    public DateTime? PaymentDate { get; set; }

    [Required]
    [MaxLength(50)]
    public string PaymentMethod { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Status { get; set; } = "1";

    [MaxLength(100)]
    public string? ReceiptNumber { get; set; }

    [MaxLength(100)]
    public string? TransactionId { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    [MaxLength(100)]
    public string? UpdatedBy { get; set; }

    public DateTime? UpdatedDate { get; set; }
    public int? SubCompanyId { get; set; }

    // 🔴 CRITICAL FIX
    [JsonIgnore]
    [ForeignKey("MemberId")]
    public Member? Member { get; set; }
}
