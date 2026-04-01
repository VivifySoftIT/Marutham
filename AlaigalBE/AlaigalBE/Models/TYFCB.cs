using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models
{
    public class TYFCB
    {
        [Key]
        public int Id { get; set; }

        // Who gave TYFCB
        public int GivenByMemberId { get; set; }
        [ForeignKey("GivenByMemberId")]
        public virtual Member? GivenByMember { get; set; }

        // Who received TYFCB
        public int ReceivedByMemberId { get; set; }
        [ForeignKey("ReceivedByMemberId")]
        public virtual Member? ReceivedByMember { get; set; }

        // Details
        public DateTime? VisitDate { get; set; } = DateTime.Now;

        [StringLength(200)]
        public string? BusinessVisited { get; set; }

        [StringLength(1000)]
        public string? Notes { get; set; }
        public string? Status { get; set; }   // ✅ NEW

        public int? Rating { get; set; } // 1-5 stars
        public decimal? Amount { get; set; } // ← Must exist
                                             // Audit
        public int? SubCompanyId { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}
