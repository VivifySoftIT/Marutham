// Models/MeetingDetail.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models
{
    public class MeetingDetail
    {
        [Key]
        public int Id { get; set; }

        public int? SubCompanyId { get; set; }

        public string? MeetingCode { get; set; } = string.Empty;

        [Required]
        public DateOnly MeetingDate { get; set; }

        [MaxLength(255)]
        public string? Place { get; set; }

        [Required]
        public TimeOnly Time { get; set; }

        [MaxLength(50)]
        public string? ContactPersonName { get; set; }

        [MaxLength(50)]
        public string? ContactPersonNum { get; set; }

        [MaxLength(150)]
        public string? MeetingTitle { get; set; }

        public string? Description { get; set; }

        [Required, MaxLength(10)]
        public string MeetingType { get; set; } = "Offline"; // "Online" or "Offline"

        [MaxLength(500)]
        public string? MeetingLink { get; set; }

        [Required, MaxLength(200)]
        public string MemberDetails { get; set; } = "All Members"; // "All Members" or "Specified Members"

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;

        public int? CreatedBy { get; set; } // This is the Member.Id

        [MaxLength(500)]
        public string? PosterImageUrl { get; set; }
    }