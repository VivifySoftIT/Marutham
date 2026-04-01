using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models
{
    public class MemberActivityLog
    {
        [Key]
        public int Id { get; set; }

        public int MemberId { get; set; }
        [ForeignKey("MemberId")]
        public virtual Member? Member { get; set; }

        [Required]
        [StringLength(50)]
        public string ActivityType { get; set; } = string.Empty; // Login/Referral/TYFCB/Payment/etc

        [StringLength(500)]
        public string? ActivityDescription { get; set; }

        public DateTime ActivityDate { get; set; } = DateTime.Now;

        // Related IDs
        public int? RelatedMemberId { get; set; }
        public int? RelatedRecordId { get; set; }

        [StringLength(50)]
        public string? IPAddress { get; set; }

        [StringLength(200)]
        public string? DeviceInfo { get; set; }
    }
}
