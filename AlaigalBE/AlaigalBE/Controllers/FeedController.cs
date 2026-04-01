using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Alaigal.Data;
using Alaigal.Models;
using System.Globalization;

namespace AlaigalBE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class FeedController : ControllerBase
{
    private readonly AlaigalRefContext _context;
    private readonly ILogger<FeedController> _logger;

    public FeedController(AlaigalRefContext context, ILogger<FeedController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/Feed/member/{memberId}
    [HttpGet("member/{memberId}")]
    public async Task<ActionResult<IEnumerable<FeedItemDto>>> GetMemberFeed(int memberId)
    {
        try
        {
            var memberExists = await _context.Members.AnyAsync(m => m.Id == memberId);
            if (!memberExists)
                return NotFound(new { message = $"Member with ID {memberId} not found" });

            var feedItems = new List<FeedItemDto>();

            var referralsGiven = await _context.Referrals
                .Where(r => r.GivenByMemberId == memberId)
                .Include(r => r.ReceivedByMember)
                .OrderByDescending(r => r.ReferralDate)
                .ToListAsync();

            foreach (var r in referralsGiven)
            {
                feedItems.Add(new FeedItemDto
                {
                    Id = $"referral_given_{r.Id}",
                    Type = "referral_given",
                    Title = "Referral Given",
                    Description = $"You gave a referral to {r.ReceivedByMember?.Name ?? "Unknown"}",
                    Date = r.ReferralDate.ToString("yyyy-MM-dd"),
                    Status = r.Status ?? "Pending",
                    Icon = "account-arrow-right",
                    Color = "#4CAF50",
                    MemberName = r.ReceivedByMember?.Name,
                    Amount = r.Revenue
                });
            }

            var referralsReceived = await _context.Referrals
                .Where(r => r.ReceivedByMemberId == memberId)
                .Include(r => r.GivenByMember)
                .OrderByDescending(r => r.ReferralDate)
                .ToListAsync();

            foreach (var r in referralsReceived)
            {
                feedItems.Add(new FeedItemDto
                {
                    Id = $"referral_received_{r.Id}",
                    Type = "referral_received",
                    Title = "Referral Received",
                    Description = $"You received a referral from {r.GivenByMember?.Name ?? "Unknown"}",
                    Date = r.ReferralDate.ToString("yyyy-MM-dd"),
                    Status = r.Status ?? "Pending",
                    Icon = "account-arrow-left",
                    Color = "#2196F3",
                    MemberName = r.GivenByMember?.Name,
                    Amount = r.Revenue
                });
            }

            var tyfcbGiven = await _context.TYFCB
                .Where(t => t.GivenByMemberId == memberId)
                .Include(t => t.ReceivedByMember)
                .OrderByDescending(t => t.VisitDate)
                .ToListAsync();

            foreach (var t in tyfcbGiven)
            {
                feedItems.Add(new FeedItemDto
                {
                    Id = $"tyfcb_given_{t.Id}",
                    Type = "tyfcb_given",
                    Title = "ThanksNote Given",
                    Description = $"You visited {t.BusinessVisited ?? "a business"}",
                    Date = t.VisitDate?.ToString("yyyy-MM-dd") ?? "",
                    Status = "Pending",
                    Icon = "handshake",
                    Color = "#FF9800",
                    MemberName = t.ReceivedByMember?.Name,
                    Amount = 0
                });
            }

            var tyfcbReceived = await _context.TYFCB
                .Where(t => t.ReceivedByMemberId == memberId)
                .Include(t => t.GivenByMember)
                .OrderByDescending(t => t.VisitDate)
                .ToListAsync();

            foreach (var t in tyfcbReceived)
            {
                feedItems.Add(new FeedItemDto
                {
                    Id = $"tyfcb_received_{t.Id}",
                    Type = "tyfcb_received",
                    Title = "ThanksNote Received",
                    Description = $"{t.GivenByMember?.Name ?? "Someone"} visited your business",
Date = t.VisitDate?.ToString("yyyy-MM-dd") ?? "",
                    Status = "Pending",
                    Icon = "hand-heart",
                    Color = "#E91E63",
                    MemberName = t.GivenByMember?.Name,
                    Amount = 0
                });
            }

            var meetings = await _context.OneToOneMeetings
                .Where(m => m.Member1Id == memberId || m.Member2Id == memberId)
                .Include(m => m.Member1)
                .Include(m => m.Member2)
                .OrderByDescending(m => m.MeetingDate)
                .ToListAsync();

            foreach (var m in meetings)
            {
                var otherMember = m.Member1Id == memberId ? m.Member2 : m.Member1;

                feedItems.Add(new FeedItemDto
                {
                    Id = $"meeting_{m.Id}",
                    Type = "one_to_one",
                    Title = "One-to-One Meeting",
                    Description = $"You met with {otherMember?.Name ?? "Unknown"}",
                    Date = m.MeetingDate.ToString("yyyy-MM-dd"),
                    Status = m.Status ?? "Completed",
                    Icon = "calendar-account",
                    Color = "#3F51B5",
                    MemberName = otherMember?.Name,
                    Amount = 0
                });
            }

            return Ok(feedItems.OrderByDescending(f => f.Date).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Feed error");
            return StatusCode(500, new
            {
                message = "Error fetching feed",
                error = ex.Message
            });
        }
    }

    // GET: api/Feed/member/{memberId}/referrals
    [HttpGet("member/{memberId}/referrals")]
    public async Task<ActionResult<IEnumerable<FeedItemDto>>> GetMemberReferrals(int memberId)
    {
        try
        {
            var memberExists = await _context.Members.AnyAsync(m => m.Id == memberId);
            if (!memberExists)
                return NotFound(new { message = "Member not found" });

            // ---------------- GIVEN ----------------
            var given = await _context.Referrals
                .Where(r => r.GivenByMemberId == memberId)
                .OrderByDescending(r => r.ReferralDate)
                .Select(r => new FeedItemDto
                {
                    Id = r.Id.ToString(),
                    Type = "referral_given",
                    Title = "Referral Given",
                    Description = "You gave a referral",
                    Date = r.ReferralDate.ToString("yyyy-MM-dd"),
                    Status = r.Status ?? "Pending",
                    Icon = "account-arrow-right",
                    Color = "#4CAF50",
                    MemberName = r.ReceivedByMember != null ? r.ReceivedByMember.Name : null,
                    Amount = r.Revenue
                })
                .ToListAsync();

            // ---------------- RECEIVED ----------------
            var received = await _context.Referrals
                .Where(r => r.ReceivedByMemberId == memberId)
                .OrderByDescending(r => r.ReferralDate)
                .Select(r => new FeedItemDto
                {
                    Id = r.Id.ToString(),
                    Type = "referral_received",
                    Title = "Referral Received",
                    Description = "You received a referral",
                    Date = r.ReferralDate.ToString("yyyy-MM-dd"),
                    Status = r.Status ?? "Pending",
                    Icon = "account-arrow-left",
                    Color = "#2196F3",
                    MemberName = r.GivenByMember != null ? r.GivenByMember.Name : null,
                    Amount = r.Revenue
                })
                .ToListAsync();

            var result = given
                .Concat(received)
                .OrderByDescending(f =>
                    DateTime.ParseExact(f.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture))
                .ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ex.Message);
            return StatusCode(500, new
            {
                message = "Error fetching feed",
                error = ex.Message
            });
        }
    }

    // GET: api/Feed/member/{memberId}/tyfcb
    [HttpGet("member/{memberId}/tyfcb")]
    public async Task<ActionResult<IEnumerable<FeedItemDto>>> GetMemberTYFCB(int memberId)
    {
        try
        {
            var member = await _context.Members.FindAsync(memberId);
            if (member == null)
            {
                return NotFound(new { message = $"Member with ID {memberId} not found" });
            }

            var feedItems = new List<FeedItemDto>();

            // TYFCB Given by member
            var tyfcbGiven = await _context.TYFCB
                .Where(t => t.GivenByMemberId == memberId)
                .Include(t => t.ReceivedByMember)
                .OrderByDescending(t => t.VisitDate)
                .ToListAsync();

            foreach (var tyfcb in tyfcbGiven)
            {
                feedItems.Add(new FeedItemDto
                {
                    Id = $"tyfcb_given_{tyfcb.Id}",
                    Type = "tyfcb_given",
                    Title = "ThanksNote Given",
                    Description = $"You visited {tyfcb.BusinessVisited ?? "a business"}",
                    Date = tyfcb.VisitDate?.ToString("yyyy-MM-dd") ?? "",
                    Status = tyfcb.Status ?? "Pending", // ✅ Use real status
                    Icon = "handshake",
                    Color = "#FF9800",
                    MemberName = tyfcb.ReceivedByMember?.Name,
                    Amount = tyfcb.Amount ?? 0
                });
            }

            // TYFCB Received by member
            var tyfcbReceived = await _context.TYFCB
                .Where(t => t.ReceivedByMemberId == memberId)
                .Include(t => t.GivenByMember)
                .OrderByDescending(t => t.VisitDate)
                .ToListAsync();

            foreach (var tyfcb in tyfcbReceived)
            {
                feedItems.Add(new FeedItemDto
                {
                    Id = $"tyfcb_received_{tyfcb.Id}",
                    Type = "tyfcb_received",
                    Title = "ThanksNote Received",
                    Description = $"{tyfcb.GivenByMember?.Name ?? "Someone"} visited your business",
                    Date = tyfcb.VisitDate?.ToString("yyyy-MM-dd") ?? "",
                    Status = tyfcb.Status ?? "Pending", // ✅ Use real status
                    Icon = "hand-heart",
                    Color = "#E91E63",
                    MemberName = tyfcb.GivenByMember?.Name,
                    Amount = tyfcb.Amount ?? 0
                });
            }

            // Sort by date (newest first)
            var sortedFeed = feedItems
                .Where(f => !string.IsNullOrEmpty(f.Date))
                .OrderByDescending(f => DateTime.ParseExact(f.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture))
                .ToList();

            return Ok(sortedFeed);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error fetching TYFCB records",
                error = ex.InnerException?.Message ?? ex.Message
            });
        }
    }

    // GET: api/Feed/member/{memberId}/meetings
    [HttpGet("member/{memberId}/meetings")]
    public async Task<ActionResult<IEnumerable<FeedItemDto>>> GetMemberMeetings(int memberId)
    {
        try
        {
            _logger.LogInformation($"Getting meetings for member ID: {memberId}");

            var member = await _context.Members.FindAsync(memberId);
            if (member == null)
            {
                return NotFound(new { message = $"Member with ID {memberId} not found" });
            }

            var feedItems = new List<FeedItemDto>();

            // =========================================
            // 1️⃣ GET MEETINGS FROM ATTENDANCE TABLE
            // =========================================

            var attendanceMeetings = await _context.Attendance
                .Where(a => a.MemberId == memberId && a.MeetingId != null)
                .Select(a => a.MeetingId.Value)
                .Distinct()
                .ToListAsync();

            if (attendanceMeetings.Any())
            {
                var meetings = await _context.MeetingDetails
                    .Where(m => attendanceMeetings.Contains(m.Id) && m.IsActive)
                    .OrderByDescending(m => m.MeetingDate)
                    .ToListAsync();

                foreach (var meeting in meetings)
                {
                    feedItems.Add(new FeedItemDto
                    {
                        Id = $"meeting_general_{meeting.Id}",
                        Type = "meeting",
                        Title = meeting.MeetingTitle ?? "Meeting",
                        Description = meeting.Description ?? "General Meeting",
                        Date = meeting.MeetingDate.ToString("yyyy-MM-dd"),
                        Status = "Completed",
                        Icon = "calendar",
                        Color = "#4CAF50",
                        MemberName = null,
                        Amount = 0
                    });
                }
            }

            // =========================================
            // 2️⃣ ONE-TO-ONE (Participant 1)
            // =========================================

            var meetingsAsParticipant1 = await _context.OneToOneMeetings
                .Where(m => m.Member1Id == memberId)
                .Include(m => m.Member2)
                .OrderByDescending(m => m.MeetingDate)
                .ToListAsync();

            foreach (var meeting in meetingsAsParticipant1)
            {
                feedItems.Add(new FeedItemDto
                {
                    Id = $"meeting_p1_{meeting.Id}",
                    Type = "one_to_one",
                    Title = "One-to-One Meeting",
                    Description = $"You met with {meeting.Member2?.Name ?? "Unknown"}",
                    Date = meeting.MeetingDate.ToString("yyyy-MM-dd"),
                    Status = !string.IsNullOrEmpty(meeting.Status) ? meeting.Status : "Completed",
                    Icon = "calendar-account",
                    Color = "#3F51B5",
                    MemberName = meeting.Member2?.Name,
                    Amount = 0
                });
            }

            // =========================================
            // 3️⃣ ONE-TO-ONE (Participant 2)
            // =========================================

            var meetingsAsParticipant2 = await _context.OneToOneMeetings
                .Where(m => m.Member2Id == memberId)
                .Include(m => m.Member1)
                .OrderByDescending(m => m.MeetingDate)
                .ToListAsync();

            foreach (var meeting in meetingsAsParticipant2)
            {
                feedItems.Add(new FeedItemDto
                {
                    Id = $"meeting_p2_{meeting.Id}",
                    Type = "one_to_one",
                    Title = "One-to-One Meeting",
                    Description = $"You met with {meeting.Member1?.Name ?? "Unknown"}",
                    Date = meeting.MeetingDate.ToString("yyyy-MM-dd"),
                    Status = !string.IsNullOrEmpty(meeting.Status) ? meeting.Status : "Completed",
                    Icon = "calendar-account",
                    Color = "#3F51B5",
                    MemberName = meeting.Member1?.Name,
                    Amount = 0
                });
            }

            if (!feedItems.Any())
                return Ok(new List<FeedItemDto>());

            var sortedFeed = feedItems
                .OrderByDescending(f => DateTime.ParseExact(f.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture))
                .ToList();

            return Ok(sortedFeed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching meetings for member {memberId}");

            return StatusCode(500, new
            {
                message = "Error fetching meetings",
                error = ex.InnerException?.Message ?? ex.Message
            });
        }
    }
    [HttpGet("member/{memberId}/visitors")]
    public async Task<ActionResult<IEnumerable<VisitorDto>>> GetMemberVisitors(int memberId)
    {
        try
        {
            var member = await _context.Members.FindAsync(memberId);
            if (member == null)
            {
                return NotFound(new { message = $"Member with ID {memberId} not found" });
            }

            // Fetch visitors brought by this member
            var visitors = await _context.Visitors
                .Where(v => v.BroughtByMemberId == memberId)
                .OrderByDescending(v => v.VisitDate)
                .Select(v => new VisitorDto
                {
                    Id = v.Id,
                    VisitorName = v.VisitorName ?? $"{v.FirstName} {v.LastName}".Trim(),
                    VisitorPhone = v.VisitorPhone ?? v.MobileNumber,
                    VisitorEmail = v.VisitorEmail,
                    VisitorBusiness = v.VisitorBusiness ?? v.Company,
                    VisitDate = v.VisitDate.ToString("yyyy-MM-dd"),
                    BecameMember = v.BecameMember,
                    Notes = v.Notes,
                    Status = v.Status ?? "Pending",
                    Title = v.Title,
                    FirstName = v.FirstName,
                    LastName = v.LastName,
                    Company = v.Company,
                    Language = v.Language,
                    TelephoneNumber = v.TelephoneNumber,
                    MobileNumber = v.MobileNumber,
                    VisitorCountry = v.VisitorCountry,
                    VisitorAddress = v.VisitorAddress,
                    VisitorCity = v.VisitorCity,
                    VisitorState = v.VisitorState,
                    VisitorPostcode = v.VisitorPostcode,
                    Region = v.Region,
                    Chapter = v.Chapter,
                    Country = v.Country,
                    SubCompanyId = v.SubCompanyId
                })
                .ToListAsync();

            return Ok(visitors);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error fetching visitor records",
                error = ex.InnerException?.Message ?? ex.Message
            });
        }
    }

    public class VisitorDto
    {
        public int Id { get; set; }
        public string VisitorName { get; set; }
        public string VisitorPhone { get; set; }
        public string VisitorEmail { get; set; }
        public string VisitorBusiness { get; set; }
        public string VisitDate { get; set; }
        public bool? BecameMember { get; set; }
        public string Notes { get; set; }
        public string Status { get; set; }
        public string Title { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Company { get; set; }
        public string Language { get; set; }
        public string TelephoneNumber { get; set; }
        public string MobileNumber { get; set; }
        public string VisitorCountry { get; set; }
        public string VisitorAddress { get; set; }
        public string VisitorCity { get; set; }
        public string VisitorState { get; set; }
        public string VisitorPostcode { get; set; }
        public string Region { get; set; }
        public string Chapter { get; set; }
        public string Country { get; set; }
        public int? SubCompanyId { get; set; }
    }
    // GET: api/Feed/test/{memberId}
    [HttpGet("test/{memberId}")]
    public async Task<ActionResult> TestDatabaseConnection(int memberId)
    {
        try
        {
            var results = new
            {
                MemberExists = await _context.Members.AnyAsync(m => m.Id == memberId),
                ReferralsCount = await _context.Referrals.CountAsync(r => r.GivenByMemberId == memberId || r.ReceivedByMemberId == memberId),
                TYFCBCount = await _context.TYFCB.CountAsync(t => t.GivenByMemberId == memberId || t.ReceivedByMemberId == memberId),
                MeetingsCount = await _context.OneToOneMeetings.CountAsync(m => m.Member1Id == memberId || m.Member2Id == memberId),
                DatabaseName = _context.Database.GetDbConnection().Database,
                Server = _context.Database.GetDbConnection().DataSource
            };

            return Ok(results);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Database test failed",
                error = ex.Message,
                connectionString = _context.Database.GetDbConnection().ConnectionString
            });
        }
    }
}

// DTO for feed items
public class FeedItemDto
{
    public string? Id { get; set; } = string.Empty;
    public string? Type { get; set; } = string.Empty;
    public string? Title { get; set; } = string.Empty;
    public string? Description { get; set; } = string.Empty;
    public string? Date { get; set; } = string.Empty;
    public string? Status { get; set; } = string.Empty;
    public string? Icon { get; set; } = string.Empty;
    public string? Color { get; set; } = string.Empty;
    public string? MemberName { get; set; }
    public decimal? Amount { get; set; }
}