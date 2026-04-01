using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models;

[Table("BirthdayWishLogs")]
public class BirthdayWishLog
{
    [Key]
    public int Id { get; set; }

    public int MemberId { get; set; }
    public int SentById { get; set; }
    public DateTime SentDate { get; set; }

    // Navigation properties (optional)
    [ForeignKey("MemberId")]
    public virtual Member? Member { get; set; }

    [ForeignKey("SentById")]
    public virtual Member? SentBy { get; set; }
}