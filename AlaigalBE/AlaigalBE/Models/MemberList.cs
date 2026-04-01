using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

// Alaigal/Models/Memberslist.cs
namespace Alaigal.Models;

public class Memberslist
{
    public int Id { get; set; }
    public string Membername { get; set; } = string.Empty;
    public string? MobileNum { get; set; }
    public DateOnly? Joiningdate { get; set; }
    public string? Business { get; set; }
    public int? ReferenceId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime Crtdate { get; set; } = DateTime.UtcNow;
    public string? Crtby { get; set; }
    public string? Updatedby { get; set; }
    public DateTime Updateddate { get; set; } = DateTime.UtcNow;
}