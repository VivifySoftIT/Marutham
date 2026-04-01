using System.ComponentModel.DataAnnotations;

namespace Alaigal.Models;

public class MemberslistDto
{
    [Required]
    [MaxLength(100)]
    public string Membername { get; set; } = string.Empty;

    [MaxLength(15)]
    public string? MobileNum { get; set; }

    public DateOnly? Joiningdate { get; set; }

    [MaxLength(255)]
    public string? Business { get; set; }

    public int? ReferenceId { get; set; }

    public bool IsActive { get; set; } = true;

    [Required]
    [MaxLength(100)]
    public string Crtby { get; set; } = string.Empty;
}
public class DeleteMemberRequest
{
    public int Id { get; set; }
}