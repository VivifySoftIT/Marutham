using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models
{
    public class OneToOneMeeting
    {
        [Key]
        public int Id { get; set; }

        // Meeting participants
        public int Member1Id { get; set; }
        [ForeignKey("Member1Id")]
        public virtual Member? Member1 { get; set; }

        public int Member2Id { get; set; }
        [ForeignKey("Member2Id")]
        public virtual Member? Member2 { get; set; }

        // Meeting Details
        [Required]
        public DateTime MeetingDate { get; set; }

        [StringLength(200)]
        public string? Location { get; set; }

        [StringLength(200)]
        public string? MetWith { get; set; }

        [StringLength(1000)]
        public string? Topic { get; set; }

        public int? Duration { get; set; } // in minutes

        [StringLength(1000)]
        public string? Notes { get; set; }

        [StringLength(20)]
        public string? Status { get; set; } = "Scheduled"; // Scheduled/Completed/Cancelled
        public int? SubCompanyId { get; set; }

        // Audit
        public int? CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.Now;
        public DateTime? UpdatedDate { get; set; }
    }
}
