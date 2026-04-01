using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models;
public class MemberBusiness
{
    public int Id { get; set; }
    public int MemberId { get; set; }
    public string BusinessName { get; set; }
    public string? BusinessDescription { get; set; }
    public string? BusinessImages { get; set; } // Comma-separated paths
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }
    public bool IsActive { get; set; } = true;

   
}
