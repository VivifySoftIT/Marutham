using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models
{
    public class PaymentReminder
    {
        [Key]
        public int Id { get; set; }

        public int MemberId { get; set; }
        [ForeignKey("MemberId")]
        public virtual Member? Member { get; set; }

        // Reminder Details
        [StringLength(20)]
        public string? ReminderType { get; set; } // Due/Overdue/Final

        public DateTime SentDate { get; set; } = DateTime.Now;

        public bool EmailSent { get; set; } = false;
        public bool SMSSent { get; set; } = false;

        [Column(TypeName = "decimal(18,2)")]
        public decimal? DueAmount { get; set; }

        [Column(TypeName = "date")]
        public DateTime? DueDate { get; set; }

        // Audit
        [StringLength(100)]
        public string? CreatedBy { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}
