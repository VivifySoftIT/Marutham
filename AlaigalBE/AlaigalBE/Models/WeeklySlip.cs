using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models
{
    public class WeeklySlip
    {
        [Key]
        public int Id { get; set; }

        public int MemberId { get; set; }
        [ForeignKey("MemberId")]
        public virtual Member? Member { get; set; }

        // Week Details
        [Required]
        [Column(TypeName = "date")]
        public DateTime WeekStartDate { get; set; }

        [Required]
        [Column(TypeName = "date")]
        public DateTime WeekEndDate { get; set; }

        // Slip Data
        public int ReferralsGiven { get; set; } = 0;
        public int TYFCBGiven { get; set; } = 0;
        public int VisitorsBrought { get; set; } = 0;
        public int OneToOnesMet { get; set; } = 0;

        // Revenue
        [Column(TypeName = "decimal(18,2)")]
        public decimal RevenueGenerated { get; set; } = 0;

        // Status
        public DateTime? SubmittedDate { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Draft"; // Draft/Submitted/Approved

        [StringLength(1000)]
        public string? Notes { get; set; }

        // Audit
        public DateTime CreatedDate { get; set; } = DateTime.Now;
        public DateTime? UpdatedDate { get; set; }
    }
}
