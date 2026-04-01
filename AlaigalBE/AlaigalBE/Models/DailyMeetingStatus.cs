using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models;

public class DailyMeetingStatus
{
    [Key]
    public int Id { get; set; }

    public int MemberId { get; set; }

    [Column(TypeName = "date")]
    public DateTime? MeetingDate { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? Sentdate { get; set; }

    public int Status { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CrtDate { get; set; }

    [MaxLength(255)]
    public string? CrtBy { get; set; } = null!;

    [Column(TypeName = "datetime")]
    public DateTime? UpdateDate { get; set; }

    [MaxLength(255)]
    public string? UpdateBy { get; set; }
}