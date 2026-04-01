using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models
{
    public class CEU
    {
        [Key]
        public int Id { get; set; }

        public int MemberId { get; set; }
        [ForeignKey("MemberId")]
        public virtual Member? Member { get; set; }

        // CEU Details
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Description { get; set; }

        [StringLength(50)]
        public string? CEUType { get; set; } // Workshop/Seminar/Training/Conference

        [Column(TypeName = "decimal(5,2)")]
        public decimal CEUPoints { get; set; } = 1.0m;

        public DateTime? EventDate { get; set; }

        public int? Duration { get; set; } // in minutes

        // Audit
        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}
