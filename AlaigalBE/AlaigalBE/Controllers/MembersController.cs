using System.ComponentModel.DataAnnotations;
using Alaigal.Data;
using Alaigal.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class MembersController : ControllerBase
{
    private readonly AlaigalRefContext _context;
    private readonly ILogger<MembersController> _logger; // 👈 Add this
    private readonly IConfiguration _config;

    public MembersController(AlaigalRefContext context, ILogger<MembersController> logger, IConfiguration config)
    {
        _context = context;
        _logger = logger; // 👈 Assign it
        _config = config;

    }

    // GET: api/Members/GetMemberNames
    [HttpGet("GetMemberNames")]
    public async Task<ActionResult<IEnumerable<object>>> GetMemberNames([FromQuery] int? subCompanyId = null)
    {
        try
        {
            var query = _context.Members.Where(m => m.IsActive);
            if (subCompanyId.HasValue)
                query = query.Where(m => m.SubCompanyId == subCompanyId.Value);

            var memberNames = await query
                .OrderBy(m => m.Name)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Email,
                    m.Phone,
                    m.MemberId
                })
                .ToListAsync();

            return Ok(memberNames);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching member names", error = ex.Message });
        }
    }

    // GET: api/Members/GetMemberDetails/{id}
    [HttpGet("GetMemberDetails/{id}")]
    public async Task<ActionResult<object>> GetMemberDetails(int id, [FromQuery] int? subCompanyId = null)
    {
        try
        {
            var query = _context.Members.Where(m => m.Id == id && m.IsActive);
            if (subCompanyId.HasValue)
                query = query.Where(m => m.SubCompanyId == subCompanyId.Value);

            var memberDetails = await query
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Email,
                    m.Phone,
                    m.MemberId,
                    m.Address,
                    m.Business,
                    m.BusinessCategory,
                    m.Status,
                    m.FeesStatus,
                    m.MembershipType,
                    m.JoinDate,
                    m.MembershipStartDate,
                    m.MembershipEndDate,
                    m.ReferenceId,
                    m.Batch,
                    m.Gender,
                    m.DOB
                })
                .FirstOrDefaultAsync();

            if (memberDetails == null)
            {
                return NotFound(new { message = "Member not found" });
            }

            return Ok(memberDetails);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching member details", error = ex.Message });
        }
    }
    // In MembersController.cs, add this method:
    // GET: api/Members/GetByUserId/{userId}
    [HttpGet("GetByUserId/{userId}")]
    public async Task<ActionResult<object>> GetMemberByUserId(int userId)
    {
        try
        {
            // First get the user
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // If user has MemberId, get the member
            if (user.MemberId.HasValue)
            {
                var member = await _context.Members
                    .Where(m => m.Id == user.MemberId.Value && m.IsActive)
                    .Select(m => new
                    {
                        m.Id,
                        m.Name,
                        m.Email,
                        m.Phone,
                        m.MemberId
                    })
                    .FirstOrDefaultAsync();

                if (member != null)
                {
                    return Ok(member);
                }
            }

            // Try to find member by name or email as fallback
            var memberByName = await _context.Members
                .Where(m => m.IsActive && (
                    (m.Name != null && m.Name == user.FullName) ||
                    (m.Email != null && m.Email == user.Email)
                ))
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Email,
                    m.Phone,
                    m.MemberId
                })
                .FirstOrDefaultAsync();

            if (memberByName != null)
            {
                // Update the user with MemberId for future reference
                user.MemberId = memberByName.Id;
                await _context.SaveChangesAsync();

                return Ok(memberByName);
            }

            return NotFound(new { message = "Member not found for this user" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching member", error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetMembers([FromQuery] int? subCompanyId = null)
    {
        try
        {
            var query = _context.Members.Where(m => m.IsActive);
            if (subCompanyId.HasValue)
                query = query.Where(m => m.SubCompanyId == subCompanyId.Value);

            var members = await query
                .OrderBy(m => m.Name)
                .Select(m => new
                {
                    m.Id,
                    MemberId = m.MemberId ?? "N/A",
                    Name = m.Name ?? "Unknown",
                    Phone = m.Phone ?? "N/A",
                    Email = m.Email ?? "N/A",
                    Business = m.Business ?? "No Business",
                    Status = m.Status ?? "Active",
                    FeesStatus = m.FeesStatus ?? "Paid"
                })
                .ToListAsync();

            return Ok(members);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetMembers: {ex.Message}");
            return StatusCode(500, new { message = "Error fetching members", error = ex.Message });
        }
    }
    // GET: api/Members/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Member>> GetMember(int id, [FromQuery] int? subCompanyId = null)
    {
        var query = _context.Members
            .Include(m => m.Payments)
            .Include(m => m.Attendances)
            .Where(m => m.Id == id);

        if (subCompanyId.HasValue)
            query = query.Where(m => m.SubCompanyId == subCompanyId.Value);

        var member = await query.FirstOrDefaultAsync();

        if (member == null)
        {
            return NotFound();
        }

        return member;
    }


   

    // GET: api/Members/stats
    [HttpGet("stats")]
    public async Task<ActionResult<object>> GetMemberStats([FromQuery] int? subCompanyId = null)
    {
        var query = _context.Members.Where(m => m.IsActive);
        if (subCompanyId.HasValue)
            query = query.Where(m => m.SubCompanyId == subCompanyId.Value);

        var total = await query.CountAsync();
        var active = await query.CountAsync(m => m.Status == "Active");
        var pending = await query.CountAsync(m => m.Status == "Pending");
        var unpaid = await query.CountAsync(m => m.FeesStatus == "Unpaid");

        return new
        {
            total,
            active,
            pending,
            unpaid
        };
    }
    [HttpPost("{id}/edit")]
    public async Task<ActionResult<Member>> EditMember(int id, [FromForm] UpdateMemberDto dto)
    {
        try
        {
            if (dto == null)
                return BadRequest("Update data is required.");

            var member = await _context.Members.FirstOrDefaultAsync(m => m.Id == id && m.IsActive);
            if (member == null)
                return NotFound($"Member with ID {id} not found.");

            // Basic fields
            if (!string.IsNullOrWhiteSpace(dto.Name))
                member.Name = dto.Name.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Phone))
                member.Phone = dto.Phone.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Email))
                member.Email = dto.Email.Trim().ToLower();

            member.DOB = dto.DOB;
            member.Gender = dto.Gender ?? "Other";
            member.Address = dto.Address?.Trim();

            // SubCompany validation
            if (dto.SubCompanyId.HasValue)
            {
                var subCompanyExists = await _context.SubCompanies.AnyAsync(sc => sc.Id == dto.SubCompanyId.Value);
                if (!subCompanyExists)
                    return BadRequest($"SubCompany with ID {dto.SubCompanyId.Value} does not exist.");
                member.SubCompanyId = dto.SubCompanyId.Value;
            }

            member.JoinDate = dto.JoinDate;
            if (!string.IsNullOrWhiteSpace(dto.Status))
                member.Status = dto.Status;

            // ✅ PROFILE IMAGE UPLOAD (Single file - replaces existing)
            if (dto.ProfileImage != null && dto.ProfileImage.Length > 0)
            {
                if (!string.IsNullOrWhiteSpace(member.ProfileImage))
                {
                    var oldFileName = Path.GetFileName(member.ProfileImage);
                    var year = DateTime.Now.Year.ToString();
                    var oldPhysicalPath = Path.Combine(_config["VideoFilePath"], year, oldFileName);
                    if (System.IO.File.Exists(oldPhysicalPath))
                    {
                        System.IO.File.Delete(oldPhysicalPath);
                    }
                }
                member.ProfileImage = await SaveAttachmentFileAsync(dto.ProfileImage);
            }

            // ✅ HANDLE "Business" FIELD (single text input from Professional tab)
            // Store this in MemberBusinesses table as well
            if (dto.Business != null && dto.Business.Any())
            {
                _logger?.LogInformation($"Processing Business field with {dto.Business.Count} values");

                foreach (var businessName in dto.Business)
                {
                    if (string.IsNullOrWhiteSpace(businessName))
                        continue;

                    var trimmedName = businessName.Trim();

                    // Check if this business already exists for this member
                    var existingBusiness = await _context.MemberBusinesses
                        .FirstOrDefaultAsync(mb => mb.MemberId == id
                            && mb.BusinessName == trimmedName
                            && mb.IsActive);

                    if (existingBusiness == null)
                    {
                        // Create new business from Business field
                        var newBusiness = new MemberBusiness
                        {
                            MemberId = id,
                            BusinessName = trimmedName,
                            BusinessDescription = null,
                            CreatedDate = DateTime.UtcNow,
                            IsActive = true
                        };
                        _context.MemberBusinesses.Add(newBusiness);
                        await _context.SaveChangesAsync();
                        _logger?.LogInformation($"Created business from Business field: {trimmedName} (ID: {newBusiness.Id})");
                    }
                    else
                    {
                        _logger?.LogInformation($"Business '{trimmedName}' already exists (ID: {existingBusiness.Id})");
                    }
                }

                // Also keep it in the old Member.Business field for backward compatibility
                member.Business = string.Join(",", dto.Business.Where(b => !string.IsNullOrWhiteSpace(b)).Select(b => b.Trim()));
            }

            // ✅ HANDLE BUSINESSES ARRAY (from MyBusinesses section)
            if (dto.Businesses != null && dto.Businesses.Any())
            {
                _logger?.LogInformation($"Processing {dto.Businesses.Count} businesses from MyBusinesses section");

                var existingBusinesses = await _context.MemberBusinesses
                    .Where(mb => mb.MemberId == id && mb.IsActive)
                    .ToListAsync();

                foreach (var businessDto in dto.Businesses)
                {
                    if (string.IsNullOrWhiteSpace(businessDto.BusinessName))
                    {
                        _logger?.LogWarning("Skipping business with empty name");
                        continue;
                    }

                    MemberBusiness business;

                    if (businessDto.Id.HasValue && businessDto.Id.Value > 0)
                    {
                        // Update existing business
                        business = existingBusinesses.FirstOrDefault(b => b.Id == businessDto.Id.Value);
                        if (business != null)
                        {
                            _logger?.LogInformation($"Updating existing business ID {business.Id}");
                            business.BusinessName = businessDto.BusinessName.Trim();
                            business.BusinessDescription = businessDto.BusinessDescription?.Trim();
                            business.UpdatedDate = DateTime.UtcNow;
                        }
                        else
                        {
                            _logger?.LogWarning($"Business ID {businessDto.Id.Value} not found, creating new one");
                            business = new MemberBusiness
                            {
                                MemberId = id,
                                BusinessName = businessDto.BusinessName.Trim(),
                                BusinessDescription = businessDto.BusinessDescription?.Trim(),
                                CreatedDate = DateTime.UtcNow,
                                IsActive = true
                            };
                            _context.MemberBusinesses.Add(business);
                            await _context.SaveChangesAsync();
                            _logger?.LogInformation($"Created business with ID {business.Id}");
                        }
                    }
                    else
                    {
                        // Create new business
                        _logger?.LogInformation($"Creating new business: {businessDto.BusinessName}");
                        business = new MemberBusiness
                        {
                            MemberId = id,
                            BusinessName = businessDto.BusinessName.Trim(),
                            BusinessDescription = businessDto.BusinessDescription?.Trim(),
                            CreatedDate = DateTime.UtcNow,
                            IsActive = true
                        };
                        _context.MemberBusinesses.Add(business);
                        await _context.SaveChangesAsync();
                        _logger?.LogInformation($"Created business with ID {business.Id}");
                    }

                    // Handle images for this business
                    var imagePaths = new List<string>();

                    if (businessDto.ExistingImagePaths != null && businessDto.ExistingImagePaths.Any())
                    {
                        imagePaths.AddRange(businessDto.ExistingImagePaths.Where(img => !string.IsNullOrWhiteSpace(img)));
                        _logger?.LogInformation($"Keeping {imagePaths.Count} existing images");
                    }

                    if (businessDto.NewImages != null && businessDto.NewImages.Any())
                    {
                        _logger?.LogInformation($"Uploading {businessDto.NewImages.Count} new images");
                        foreach (var image in businessDto.NewImages)
                        {
                            if (image != null && image.Length > 0)
                            {
                                var imagePath = await SaveAttachmentFileAsync(image);
                                imagePaths.Add(imagePath);
                                _logger?.LogInformation($"Uploaded image: {imagePath}");
                            }
                        }
                    }

                    business.BusinessImages = imagePaths.Any() ? string.Join(",", imagePaths.Distinct()) : null;
                    _logger?.LogInformation($"Business {business.Id} has {imagePaths.Count} total images");
                }
            }

            member.UpdatedBy = "Admin";
            member.UpdatedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger?.LogInformation($"Member {id} updated successfully");

            // ✅ Return member with businesses
            var memberData = await _context.Members
                .Where(m => m.Id == id)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Email,
                    m.Phone,
                    m.Gender,
                    m.DOB,
                    m.Address,
                    m.ProfileImage,
                    m.JoinDate,
                    m.Status,
                    m.SubCompanyId
                })
                .FirstOrDefaultAsync();

            var businesses = await _context.MemberBusinesses
                .Where(mb => mb.MemberId == id && mb.IsActive)
                .Select(mb => new
                {
                    mb.Id,
                    mb.BusinessName,
                    mb.BusinessDescription,
                    mb.BusinessImages
                })
                .ToListAsync();

            _logger?.LogInformation($"Returning {businesses.Count} businesses for member {id}");

            var businessesWithImages = businesses.Select(b => new
            {
                b.Id,
                b.BusinessName,
                b.BusinessDescription,
                ImagePaths = !string.IsNullOrEmpty(b.BusinessImages)
                    ? b.BusinessImages.Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(img => img.Trim())
                        .ToList()
                    : new List<string>()
            }).ToList();

            var result = new
            {
                memberData.Id,
                memberData.Name,
                memberData.Email,
                memberData.Phone,
                memberData.Gender,
                memberData.DOB,
                memberData.Address,
                memberData.ProfileImage,
                memberData.JoinDate,
                memberData.Status,
                memberData.SubCompanyId,
                Businesses = businessesWithImages
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error updating member {id}");
            return StatusCode(500, new
            {
                message = "Error updating member",
                error = ex.Message,
                innerException = ex.InnerException?.Message
            });
        }
    }
    [HttpPost("business/{businessId}/delete")]
    public async Task<ActionResult> DeleteBusiness(int businessId)
    {
        try
        {
            var business = await _context.MemberBusinesses
                .FirstOrDefaultAsync(mb => mb.Id == businessId);

            if (business == null)
            {
                return NotFound(new { message = $"Business with ID {businessId} not found" });
            }

            // Soft delete - set IsActive to false
            business.IsActive = false;
            business.UpdatedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger?.LogInformation($"Business ID {businessId} soft deleted successfully");

            return Ok(new
            {
                message = "Business deleted successfully",
                businessId = businessId
            });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error deleting business {businessId}");
            return StatusCode(500, new
            {
                message = "Error deleting business",
                error = ex.Message
            });
        }
    }


    private async Task<string> SaveAttachmentFileAsync(IFormFile file)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("File cannot be null or empty.");

        var rootPath = _config["VideoFilePath"];
        var virtualPath = _config["VideoFileVirtualPath"];

        var year = DateTime.Now.Year.ToString();
        var extension = Path.GetExtension(file.FileName);
        var fileName = Guid.NewGuid() + extension;

        var directoryPath = Path.Combine(rootPath, year);
        Directory.CreateDirectory(directoryPath);

        var filePath = Path.Combine(directoryPath, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // ✅ Include year in virtual path
        return $"{virtualPath.TrimEnd('/')}/{fileName}";
    }
    [HttpPost("bulk")]
    public async Task<ActionResult<object>> CreateBulkMembers([FromBody] BulkCreateMembersDto dto)
    {
        try
        {
            if (dto?.Members == null || !dto.Members.Any())
                return BadRequest("Member list is required.");

            var adminMember = await _context.Members
                .FirstOrDefaultAsync(m => m.Id == dto.AdminMemberId && m.IsActive);

            if (adminMember == null)
                return BadRequest("Invalid or inactive admin member ID.");

            var now = DateTime.UtcNow;
            var subCompanyId = adminMember.SubCompanyId;

            int successCount = 0;
            int failCount = 0;
            var errors = new List<string>();

            var newMembers = new List<Member>();
            var newUsers = new List<User>();

            foreach (var memberDto in dto.Members)
            {
                try
                {
                    // === Validate only 3 fields ===
                    if (string.IsNullOrWhiteSpace(memberDto.Name))
                        throw new ArgumentException("Name is required.");
                    if (string.IsNullOrWhiteSpace(memberDto.Email))
                        throw new ArgumentException("Email is required.");
                    if (string.IsNullOrWhiteSpace(memberDto.Phone))
                        throw new ArgumentException("Phone number is required.");

                    var emailTrimmed = memberDto.Email.Trim().ToLower();
                    var phoneTrimmed = memberDto.Phone.Trim();

                    // === Uniqueness checks ===
                    if (await _context.Members.AnyAsync(m => m.Email == emailTrimmed))
                        throw new ArgumentException($"Email '{emailTrimmed}' already exists in members.");
                    if (await _context.Users.AnyAsync(u => u.Email == emailTrimmed))
                        throw new ArgumentException($"Email '{emailTrimmed}' already exists in users.");
                    if (await _context.Members.AnyAsync(m => m.Phone == phoneTrimmed))
                        throw new ArgumentException($"Phone '{phoneTrimmed}' already exists.");

                    // === Generate unique MemberId (string) ===
                    string uniqueMemberId;
                    do
                    {
                        uniqueMemberId = $"MEM{DateTime.UtcNow.Ticks.ToString().Substring(8)}{new Random().Next(100, 999)}";
                    } while (await _context.Members.AnyAsync(m => m.MemberId == uniqueMemberId));

                    // === Create Member ===
                    var newMember = new Member
                    {
                        Name = TruncateString(memberDto.Name, 100),
                        Email = emailTrimmed,
                        Phone = phoneTrimmed,
                        Business = TruncateString(memberDto.Business, 100),
                        MemberId = uniqueMemberId,
                        Status = "Active",
                        FeesStatus = "Pending",
                        IsActive = true,
                        CreatedBy = dto.AdminMemberId.ToString(),
                        CreatedDate = now,
                        UpdatedBy = dto.AdminMemberId.ToString(),
                        UpdatedDate = now,
                        Password = phoneTrimmed,
                        SubCompanyId = subCompanyId,
                        DOB = memberDto.DOB,
                        Gender = TruncateString(memberDto.Gender, 20) ?? "Other",
                        Address = TruncateString(memberDto.Address, 200),
                        ProfileImage = string.Empty,
                        BusinessCategory = TruncateString(memberDto.BusinessCategory, 100),
                        JoinDate = memberDto.JoinDate.HasValue ? memberDto.JoinDate.Value.Date : now.Date,
                        ReferralGivenCount = 0,
                        ReferralReceivedCount = 0,
                        TYFCBGivenCount = 0,
                        TYFCBReceivedCount = 0,
                        CEUsCount = 0,
                        VisitorsCount = 0,
                        RevenueReceived = 0
                    };

                    newMembers.Add(newMember);

                    // === Create User with PHONE as PASSWORD ===
                    var newUser = new User
                    {
                        Username = ExtractFirstName(memberDto.Name), // 👈 First name only
                        Email = emailTrimmed,
                        PasswordHash = phoneTrimmed, // ← PLAIN MOBILE NUMBER AS PASSWORD
                        FullName = TruncateString(memberDto.Name, 100),
                        Phone = phoneTrimmed,
                        Role = "User",
                        ProfileImage = string.Empty,
                        LastLogin = null,
                        ResetToken = null,
                        ResetTokenExpiry = null,
                        IsActive = true,
                        CreatedBy = dto.AdminMemberId.ToString(),
                        CreatedDate = now,
                        UpdatedBy = dto.AdminMemberId.ToString(),
                        UpdatedDate = now,
                        // MemberId will be set after saving members
                    };

                    newUsers.Add(newUser);
                }
                catch (Exception ex)
                {
                    failCount++;
                    errors.Add($"Failed for {memberDto.Name} ({memberDto.Email}): {ex.Message}");
                }
            }

            if (newMembers.Count == 0)
                return Ok(new { successCount = 0, failCount, totalProcessed = dto.Members.Count, errors });

            // Step 1: Save Members → get their Ids
            _context.Members.AddRange(newMembers);
            await _context.SaveChangesAsync();

            // Step 2: Link Users to Members (using Members.Id as FK)
            for (int i = 0; i < newMembers.Count; i++)
            {
                newUsers[i].MemberId = newMembers[i].Id; // assuming Users.MemberId is INT → FK to Members.Id
            }

            // Step 3: Save Users
            _context.Users.AddRange(newUsers);
            await _context.SaveChangesAsync();

            successCount = newMembers.Count;

            return Ok(new
            {
                successCount,
                failCount,
                totalProcessed = dto.Members.Count,
                errors
            });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Bulk member+user creation failed");
            return StatusCode(500, new
            {
                message = "Bulk creation failed",
                error = ex.Message,
                innerError = ex.InnerException?.Message
            });
        }
    }

    // 👇 ADD THIS HELPER METHOD
    private string ExtractFirstName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            return "user";

        var parts = fullName.Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        return parts.FirstOrDefault() ?? "user";
    }
    // Helper method to truncate strings
    private string TruncateString(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed.Substring(0, maxLength);
    }
    public class UpdateMemberDto
    {
        public string Name { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Gender { get; set; }
        public DateTime? DOB { get; set; }
        public string? Address { get; set; }
        public int? SubCompanyId { get; set; }
        public DateTime? JoinDate { get; set; }
        public string? Status { get; set; }

        // NO [Required] on these
        public IFormFile? ProfileImage { get; set; }
        public List<string>? Business { get; set; }
        public string? BusinessDescription { get; set; }
        public List<IFormFile>? BusinessImages { get; set; }
        public List<BusinessDto>? Businesses { get; set; }
    }


    public class BusinessDto
    {
        public int? Id { get; set; }
        public string? BusinessName { get; set; }
        public string? BusinessDescription { get; set; }
        public List<string>? ExistingImagePaths { get; set; }
        public List<IFormFile>? NewImages { get; set; }
    }

    public class MemberBusinessDto
    {
        public int? Id { get; set; } // Null for new business, ID for existing
        public string BusinessName { get; set; }
        public string? BusinessDescription { get; set; }
        public List<string>? ExistingImagePaths { get; set; } // Existing image URLs to keep
        public List<IFormFile>? NewImages { get; set; } // New images to upload
    }


    // POST: api/Members
    [HttpPost]
    public async Task<ActionResult<Member>> CreateMember([FromBody] CreateMemberDto dto)
    {
        try
        {
            var adminMember = await _context.Members
                .FirstOrDefaultAsync(m => m.Id == dto.CreatedBy && m.IsActive);

            if (adminMember == null)
                return BadRequest("Invalid creator member ID.");

            var existingMember = await _context.Members
                .FirstOrDefaultAsync(m => m.Email == dto.Email);

            var plainTextPassword = dto.Phone;

            if (existingMember != null)
            {
                // ✅ UPDATE existing member (including Gender)
                existingMember.Name = dto.Name;
                existingMember.Phone = dto.Phone;
                existingMember.DOB = dto.DOB;
                existingMember.Address = dto.Address;
                existingMember.Business = dto.Business;
                existingMember.ReferenceId = dto.ReferenceId;
                existingMember.Batch = dto.Batch;
                existingMember.BusinessCategory = dto.BusinessCategory;
                existingMember.MembershipType = dto.MembershipType;
                existingMember.MemberId = dto.MemberId;
                existingMember.Gender = dto.Gender?.Trim(); // 👈 ADD THIS
                existingMember.SubCompanyId = adminMember.SubCompanyId;
                existingMember.CreatedBy = dto.CreatedBy.ToString();
                existingMember.UpdatedDate = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // ✅ UPDATE existing user account
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.MemberId == existingMember.Id);

                if (existingUser != null)
                {
                    existingUser.Username = dto.Name;
                    existingUser.Email = dto.Email;
                    existingUser.PasswordHash = plainTextPassword;
                    existingUser.FullName = dto.Name;
                    existingUser.Phone = dto.Phone;
                    existingUser.UpdatedDate = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                return Ok(existingMember);
            }
            else
            {
                // ✅ CREATE new member (including Gender)
                var newMember = new Member
                {
                    Name = dto.Name,
                    Email = dto.Email,
                    Phone = dto.Phone,
                    DOB = dto.DOB,
                    Address = dto.Address,
                    Business = dto.Business,
                    ReferenceId = dto.ReferenceId,
                    Batch = dto.Batch,
                    BusinessCategory = dto.BusinessCategory,
                    MembershipType = dto.MembershipType,
                    MemberId = dto.MemberId,
                    Gender = dto.Gender?.Trim(), // 👈 ADD THIS
                    SubCompanyId = adminMember.SubCompanyId,
                    CreatedBy = dto.CreatedBy.ToString(),
                    JoinDate = DateTime.UtcNow.Date,
                    Status = "Active",
                    FeesStatus = "Unpaid",
                    IsActive = true,
                    CreatedDate = DateTime.UtcNow
                };

                _context.Members.Add(newMember);
                await _context.SaveChangesAsync();

                // ✅ CREATE new user account
                var newUser = new User
                {
                    Username = dto.Name,
                    Email = dto.Email,
                    PasswordHash = plainTextPassword,
                    FullName = dto.Name,
                    Phone = dto.Phone,
                    Role = "User",
                    ProfileImage = null,
                    IsActive = true,
                    MemberId = newMember.Id,
                    CreatedBy = dto.CreatedBy.ToString(),
                    CreatedDate = DateTime.UtcNow
                };

                _context.Users.Add(newUser);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetMember), new { id = newMember.Id }, newMember);
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating/updating member", error = ex.Message });
        }
    }
    public class BulkCreateMembersDto
    {
        public int AdminMemberId { get; set; } // The admin creating these members

        public List<CreateMemberDto> Members { get; set; } = new();
    }
    public class CreateMemberDto
    {
        [Required] public string Name { get; set; } = string.Empty;
        [Required, EmailAddress] public string? Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime? DOB { get; set; }
        public DateTime? JoinDate { get; set; }
        public string? Gender { get; set; }
        public string? Address { get; set; }
        public string? Business { get; set; }
        public string? BusinessCategory { get; set; }
        public int? ReferenceId { get; set; }
        public string? MembershipType { get; set; }
        public string? MemberId { get; set; }
        public int? CreatedBy { get; set; }
    }
    // POST: api/Members/bulk
    // POST: api/Members/bulk
    // POST: api/Members/bulk
    
    // Helper method to create user account for member
    private async Task CreateUserAccountForMember(Member member)
    {
        try
        {
            // Check if user already exists with this name
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == member.Name || u.Email == member.Email);

            if (existingUser != null)
            {
                // User already exists, update the member ID if not set
                if (existingUser.MemberId == null || existingUser.MemberId == 0)
                {
                    existingUser.MemberId = member.Id;
                    existingUser.UpdatedDate = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
                return;
            }

            // Create new user account with MemberId
            var user = new User
            {
                Username = member.Name, // Username is member name
                Email = member.Email ?? $"{member.Phone}@alaigal.com",
                PasswordHash = HashPassword(member.Phone), // Hash the phone number as password
                FullName = member.Name,
                Phone = member.Phone,
                Role = "User", // Role is User
                MemberId = member.Id, // Store the Member ID
                IsActive = true,
                CreatedDate = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Log error but don't fail member creation
            Console.WriteLine($"Failed to create user account for {member.Name}: {ex.Message}");
        }
    }

    // Helper method to hash password using SHA256
    private string HashPassword(string password)
    {
        using (var sha256 = System.Security.Cryptography.SHA256.Create())
        {
            var hashedBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }
    }

    // PUT: api/Members/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMember(int id, Member member)
    {
        if (id != member.Id)
        {
            return BadRequest();
        }

        member.UpdatedDate = DateTime.UtcNow;
        _context.Entry(member).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!MemberExists(id))
            {
                return NotFound();
            }
            throw;
        }

        return NoContent();
    }

   
    // DELETE: api/Members/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMember(int id)
    {
        var member = await _context.Members.FindAsync(id);
        if (member == null)
        {
            return NotFound();
        }

        member.IsActive = false;
        member.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool MemberExists(int id)
    {
        return _context.Members.Any(e => e.Id == id);
    }
    

}

