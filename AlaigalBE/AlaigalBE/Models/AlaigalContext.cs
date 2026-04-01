using Microsoft.EntityFrameworkCore;
using Alaigal.Models;

namespace Alaigal.Data;

public class AlaigalRefContext : DbContext
{
    public AlaigalRefContext(DbContextOptions<AlaigalRefContext> options)
        : base(options)
    {
    }

    // DbSets
    public DbSet<Memberslist> Memberslist { get; set; }
    public DbSet<Member> Members { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<Attendance> Attendance { get; set; }
    public DbSet<Batch> Batches { get; set; }
    public DbSet<Inventory> Inventory { get; set; }
    public DbSet<Notice> Notices { get; set; }
    public DbSet<User> Users { get; set; }

    // New DbSets for member networking features
    public DbSet<Referral> Referrals { get; set; }
    public DbSet<TYFCB> TYFCB { get; set; }
    public DbSet<CEU> CEUs { get; set; }
    public DbSet<OneToOneMeeting> OneToOneMeetings { get; set; }
    public DbSet<Visitor> Visitors { get; set; }
    public DbSet<WeeklySlip> WeeklySlips { get; set; }
    public DbSet<PaymentReminder> PaymentReminders { get; set; }
    public DbSet<MemberActivityLog> MemberActivityLog { get; set; }
    public DbSet<MeetingDetail> MeetingDetails { get; set; }
    public DbSet<MessageNotification> MessageNotifications { get; set; }
    // Company hierarchy DbSets
    public DbSet<MainCompany> MainCompanies { get; set; }
    public DbSet<SubCompany> SubCompanies { get; set; }
    public DbSet<BirthdayWishLog> BirthdayWishLogs { get; set; }
    public DbSet<DailyMeetingStatus> DailyMeetingStatuses { get; set; }
    public DbSet<MemberBusiness> MemberBusinesses { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Memberslist configuration
        modelBuilder.Entity<Memberslist>(entity =>
        {
            entity.ToTable("Memberslist");
            entity.HasKey(e => e.Id).HasName("PK_Memberslist_Id");
            entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
            entity.Property(e => e.Membername).HasColumnName("Membername").HasMaxLength(100).IsRequired();
            entity.Property(e => e.MobileNum).HasColumnName("MobileNum").HasMaxLength(15).IsRequired(false);
            entity.Property(e => e.Joiningdate).HasColumnName("Joiningdate").HasColumnType("date").IsRequired(false);
            entity.Property(e => e.Business).HasColumnName("Business").HasMaxLength(255).IsRequired(false);
            entity.Property(e => e.ReferenceId).HasColumnName("ReferenceId").IsRequired(false);
            entity.Property(e => e.IsActive).HasColumnName("IsActive").IsRequired().HasDefaultValue(true);
            entity.Property(e => e.Crtby).HasColumnName("Crtby").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Crtdate).HasColumnName("Crtdate").HasColumnType("datetime").HasDefaultValueSql("(getdate())");
            entity.Property(e => e.Updatedby).HasColumnName("Updatedby").HasMaxLength(100).IsRequired(false);
            entity.Property(e => e.Updateddate).HasColumnName("Updateddate").HasColumnType("datetime").HasDefaultValueSql("(getdate())");
        });
        modelBuilder.Entity<DailyMeetingStatus>(entity =>
        {
            entity.ToTable("DailyMeetingstatus", "dbo");

            entity.Property(e => e.MeetingDate).HasColumnType("date");
            entity.Property(e => e.Sentdate).HasColumnType("datetime");
            entity.Property(e => e.CrtDate).HasColumnType("datetime");
            entity.Property(e => e.UpdateDate).HasColumnType("datetime");

            entity.Property(e => e.CrtBy).HasMaxLength(255);
            entity.Property(e => e.UpdateBy).HasMaxLength(255);
        });
        // BirthdayWishLog configuration
        modelBuilder.Entity<BirthdayWishLog>(entity =>
        {
            entity.ToTable("BirthdayWishLogs");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.MemberId).IsRequired();
            entity.Property(e => e.SentById).IsRequired();
            entity.Property(e => e.SentDate).IsRequired().HasColumnType("datetime2(7)");

            // Optional: If you later add MessageNotificationId
            // entity.Property(e => e.MessageNotificationId);

            // Indexes for performance
            entity.HasIndex(e => e.MemberId);
            entity.HasIndex(e => e.SentById);
            entity.HasIndex(e => e.SentDate);

            // Foreign keys (optional but recommended)
            entity.HasOne(d => d.Member)
                .WithMany()
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.SentBy)
                .WithMany()
                .HasForeignKey(d => d.SentById)
                .OnDelete(DeleteBehavior.ClientSetNull);
        });
        // Inside OnModelCreating method in AlaigalRefContext.cs
        modelBuilder.Entity<MeetingDetail>(entity =>
        {
            entity.ToTable("MeetingDetails");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.MeetingCode).HasMaxLength(50); // Removed .IsRequired()
            entity.Property(e => e.MeetingType).IsRequired().HasMaxLength(10);
            entity.Property(e => e.MemberDetails).IsRequired().HasMaxLength(200);

            entity.Property(e => e.Place).HasMaxLength(255);
            entity.Property(e => e.ContactPersonName).HasMaxLength(50);
            entity.Property(e => e.ContactPersonNum).HasMaxLength(50);
            entity.Property(e => e.MeetingTitle).HasMaxLength(150);
            entity.Property(e => e.Description); // nvarchar(MAX)

            entity.Property(e => e.MeetingLink).HasMaxLength(500);

            entity.Property(e => e.CreatedDate).HasDefaultValueSql("GETDATE()");
            entity.Property(e => e.UpdatedDate).HasDefaultValueSql("GETDATE()");

            entity.HasIndex(e => e.SubCompanyId);
            entity.HasIndex(e => e.MeetingDate);
        });        // Member configuration
        modelBuilder.Entity<Member>(entity =>
        {
            entity.HasIndex(e => e.MemberId).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.Phone);

            entity.HasOne(m => m.SubCompany)
                  .WithMany(sc => sc.Members)
                  .HasForeignKey(m => m.SubCompanyId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    {
        // MessageNotification configuration
        modelBuilder.Entity<MessageNotification>(entity =>
        {
            entity.ToTable("MessageNotifications");
            entity.HasKey(e => e.Id);

            // ✅ Update property names to match your TABLE
            entity.Property(e => e.MessageType).IsRequired().HasMaxLength(150); // Was "Type"
            entity.Property(e => e.MemberIds).HasMaxLength(4000); // Was "RecipientType" - but your table has NO RecipientType!
            entity.Property(e => e.Subject).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.AttachmentUrl).HasMaxLength(500);
            entity.Property(e => e.CreatedDate).HasDefaultValueSql("GETDATE()");

            entity.HasOne(m => m.CreatedByMember)
                  .WithMany()
                  .HasForeignKey(m => m.CreatedBy)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Member configuration (SEPARATE block)
        modelBuilder.Entity<Member>(entity =>
        {
            entity.HasOne(m => m.SubCompany)
                  .WithMany(sc => sc.Members)
                  .HasForeignKey(m => m.SubCompanyId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ... other entity configurations ...
    }        // Payment configuration
    modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasOne(p => p.Member)
                  .WithMany(m => m.Payments)
                  .HasForeignKey(p => p.MemberId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.ReceiptNumber).IsUnique();
        });

        // Attendance configuration
        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasOne(a => a.Member)
                  .WithMany(m => m.Attendances)
                  .HasForeignKey(a => a.MemberId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.MemberId, e.AttendanceDate });
        });

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
        });

        // Batch configuration
        modelBuilder.Entity<Batch>(entity =>
        {
            entity.HasIndex(e => e.BatchCode).IsUnique();
        });

        // Referral configuration
        modelBuilder.Entity<Referral>(entity =>
        {
            entity.HasOne(r => r.GivenByMember)
                  .WithMany()
                  .HasForeignKey(r => r.GivenByMemberId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.ReceivedByMember)
                  .WithMany()
                  .HasForeignKey(r => r.ReceivedByMemberId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.ReferralCode).IsUnique();
        });

        // TYFCB configuration
        modelBuilder.Entity<TYFCB>(entity =>
        {
            entity.HasOne(t => t.GivenByMember)
                  .WithMany()
                  .HasForeignKey(t => t.GivenByMemberId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.ReceivedByMember)
                  .WithMany()
                  .HasForeignKey(t => t.ReceivedByMemberId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // CEU configuration
        modelBuilder.Entity<CEU>(entity =>
        {
            entity.HasOne(c => c.Member)
                  .WithMany()
                  .HasForeignKey(c => c.MemberId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // OneToOneMeeting configuration
        modelBuilder.Entity<OneToOneMeeting>(entity =>
        {
            entity.HasOne(o => o.Member1)
                  .WithMany()
                  .HasForeignKey(o => o.Member1Id)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(o => o.Member2)
                  .WithMany()
                  .HasForeignKey(o => o.Member2Id)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Visitor configuration
        modelBuilder.Entity<Visitor>(entity =>
        {
            entity.HasOne(v => v.BroughtByMember)
                  .WithMany()
                  .HasForeignKey(v => v.BroughtByMemberId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(v => v.ConvertedMember)
                  .WithMany()
                  .HasForeignKey(v => v.MemberId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // WeeklySlip configuration
        modelBuilder.Entity<WeeklySlip>(entity =>
        {
            entity.HasOne(w => w.Member)
                  .WithMany()
                  .HasForeignKey(w => w.MemberId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // PaymentReminder configuration
        modelBuilder.Entity<PaymentReminder>(entity =>
        {
            entity.HasOne(p => p.Member)
                  .WithMany()
                  .HasForeignKey(p => p.MemberId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // MemberActivityLog configuration
        modelBuilder.Entity<MemberActivityLog>(entity =>
        {
            entity.HasOne(m => m.Member)
                  .WithMany()
                  .HasForeignKey(m => m.MemberId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // MainCompany configuration
        modelBuilder.Entity<MainCompany>(entity =>
        {
            entity.HasIndex(e => e.CompanyCode).IsUnique();
        });

        // SubCompany configuration
        modelBuilder.Entity<SubCompany>(entity =>
        {
            entity.HasIndex(e => new { e.SubCompanyCode, e.MainCompanyId }).IsUnique();

            entity.HasOne(sc => sc.MainCompany)
                  .WithMany(mc => mc.SubCompanies)
                  .HasForeignKey(sc => sc.MainCompanyId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
