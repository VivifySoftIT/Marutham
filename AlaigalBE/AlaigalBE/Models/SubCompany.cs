using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Alaigal.Models
{
    [Table("SubCompanies")]
    public class SubCompany
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string SubCompanyName { get; set; }

        [Required]
        [StringLength(50)]
        public string SubCompanyCode { get; set; }

        [Required]
        public int MainCompanyId { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [StringLength(500)]
        public string? Address { get; set; }

        [StringLength(20)]
        public string? Phone { get; set; }

        [StringLength(255)]
        public string? Email { get; set; }

        [StringLength(255)]
        public string? Website { get; set; }

        [StringLength(500)]
        public string? Logo { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        [StringLength(100)]
        public string? CreatedBy { get; set; }

        public DateTime? ModifiedDate { get; set; }

        [StringLength(100)]
        public string? ModifiedBy { get; set; }

        // Navigation properties
        [ForeignKey("MainCompanyId")]
        public virtual MainCompany MainCompany { get; set; }

        public virtual ICollection<Member> Members { get; set; } = new List<Member>();
    }
}