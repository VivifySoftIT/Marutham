using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models
{
    public class Referral
    {
        public int Id { get; set; }
        public string ReferralCode { get; set; } = string.Empty;
        public int GivenByMemberId { get; set; }
        public int ReceivedByMemberId { get; set; }
        public string? ClientName { get; set; } = string.Empty;
        public string? ClientPhone { get; set; } = string.Empty;
        public string? ClientEmail { get; set; }
        public string BusinessType { get; set; } = string.Empty;
        public DateTime ReferralDate { get; set; }
        public string? Status { get; set; } = string.Empty;
        public decimal? Revenue { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public int? SubCompanyId { get; set; }

        // Navigation properties
        public virtual Member? GivenByMember { get; set; }
        public virtual Member? ReceivedByMember { get; set; }
    }
}
