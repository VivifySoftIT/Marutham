// Models/MessageNotification.cs
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Alaigal.Models
{
    public class MessageNotification
    {
        public int Id { get; set; }
        public DateTime? Date { get; set; } // For event/meeting date
        [Required]
        [MaxLength(150)]
        public string MessageType { get; set; } = "General"; // Birthday, Payment, Event, Meeting, Welcome

        [MaxLength(4000)] // NVARCHAR(MAX) in SQL
        public string? MemberIds { get; set; } // Comma-separated or JSON: "1,2,3"

        [Required]
        [MaxLength(255)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? AttachmentUrl { get; set; }

        public DateTime? SentDate { get; set; }
        public bool IsSent { get; set; } = false;

        public int? CreatedBy { get; set; } // MemberId
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public int? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }

        public int? SubCompanyId { get; set; } // Matches your table

        // Navigation properties
        [JsonIgnore]
        public Member? CreatedByMember { get; set; }
    }
}