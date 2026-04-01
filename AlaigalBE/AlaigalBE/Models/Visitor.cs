using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models
{
    public class Visitor
    {
        [Key]
        public int Id { get; set; }

        // Who brought the visitor
        public int BroughtByMemberId { get; set; }
        [ForeignKey("BroughtByMemberId")]
        public virtual Member? BroughtByMember { get; set; }

        // Visitor Details
        [Required]
        [StringLength(100)]
        public string? VisitorName { get; set; } = string.Empty;

        [StringLength(20)]
        public string? VisitorPhone { get; set; }

        [StringLength(100)]
        public string? VisitorEmail { get; set; }

        [StringLength(200)]
        public string? VisitorBusiness { get; set; }

        public DateTime VisitDate { get; set; } = DateTime.Now;

        // Follow-up
        public bool BecameMember { get; set; } = false;

        public int? MemberId { get; set; }
        [ForeignKey("MemberId")]
        public virtual Member? ConvertedMember { get; set; }

        [StringLength(1000)]
        public string? Notes { get; set; }

        // Extra columns
        [StringLength(10)]
        public string? Title { get; set; }          // Mr, Ms, etc.

        [StringLength(50)]
        public string? FirstName { get; set; }

        [StringLength(50)]
        public string? LastName { get; set; }

        [StringLength(200)]
        public string? Company { get; set; }

        [StringLength(20)]
        public string? Language { get; set; }

        [StringLength(20)]
        public string? TelephoneNumber { get; set; }

        [StringLength(20)]
        public string? MobileNumber { get; set; }

        [StringLength(100)]
        public string? VisitorCountry { get; set; }

        [StringLength(500)]
        public string? VisitorAddress { get; set; }

        [StringLength(100)]
        public string? VisitorCity { get; set; }

        [StringLength(50)]
        public string? VisitorState { get; set; }

        [StringLength(20)]
        public string? VisitorPostcode { get; set; }

        [StringLength(50)]
        public string? Region { get; set; }

        [StringLength(50)]
        public string? Chapter { get; set; }

        [StringLength(50)]
        public string? Country { get; set; }

        // Status: 1 = Active, 0 = Inactive
        public string Status { get; set; }
        public int? SubCompanyId { get; set; }


        // Audit
        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}
