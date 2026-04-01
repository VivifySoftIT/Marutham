using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models;

[Table("Members")]
public class Member
{
    [Key]
    public int Id { get; set; }

    [MaxLength(100)]
    public string? Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? MemberId { get; set; } = string.Empty;

    [MaxLength(15)]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Email { get; set; }

    [MaxLength(255)]
    public string? Password { get; set; } // For member login

    public DateTime? JoinDate { get; set; }
    public DateTime? DOB { get; set; }
    public string? Gender { get; set; } // For member login
    public string? BusinessDescription { get; set; }
    public string? BusinessImages { get; set; }

    [MaxLength(50)]
    public string? Status { get; set; } = "Active"; // Active, Pending, Inactive

    [MaxLength(50)]
    public string? FeesStatus { get; set; } = "Unpaid"; // Paid, Unpaid, Partial

    public string? Address { get; set; }

    [MaxLength(50)]
    public string? Batch { get; set; }

    [MaxLength(100)]
    public string? Business { get; set; }

    [MaxLength(100)]
    public string? BusinessCategory { get; set; }

    public int? ReferenceId { get; set; }

    // Company hierarchy
    public int? SubCompanyId { get; set; }

    [MaxLength(500)]
    public string? ProfileImage { get; set; }

    // Membership Details
    [MaxLength(20)]
    public string? MembershipType { get; set; } = "Monthly"; // Monthly/Annual

    public DateTime? MembershipStartDate { get; set; }
    public DateTime? MembershipEndDate { get; set; }

    // Statistics
    public int? ReferralGivenCount { get; set; } = 0;
    public int? ReferralReceivedCount { get; set; } = 0;
    public int? TYFCBGivenCount { get; set; } = 0;
    public int? TYFCBReceivedCount { get; set; } = 0;
    public int? CEUsCount { get; set; } = 0;
    public int? VisitorsCount { get; set; } = 0;

    [Column(TypeName = "decimal(18,2)")]
    public decimal? RevenueReceived { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    [MaxLength(100)]
    public string? UpdatedBy { get; set; }

    public DateTime? UpdatedDate { get; set; }

    // Navigation properties
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public virtual SubCompany? SubCompany { get; set; }
}
