using System.Text;
using Alaigal.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddMemoryCache();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddDbContext<AlaigalRefContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AlaigalDb")));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]))
    };
});
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalhost", policy =>
        policy.WithOrigins(
            "http://localhost:3000",
            "http://localhost:8081",
            "https://localhost:8081",
            "http://202.21.38.118",
            "https://vivifysoft.in",
            "https://www.vivifysoft.in"
           
        )
        .AllowAnyMethod()
        .AllowAnyHeader());
});

var app = builder.Build();

app.UseCors("AllowLocalhost");
app.UseStaticFiles();

// app.UseHttpsRedirection(); // enable after SSL

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/proxy-image", async (HttpClient httpClient, [FromQuery] string url) =>
{
    try
    {
        if (string.IsNullOrWhiteSpace(url))
            return Results.BadRequest("Image URL is required");

        var uri = new Uri(url);
        if (!uri.Host.EndsWith("vivifysoft.in", StringComparison.OrdinalIgnoreCase))
            return Results.BadRequest("Invalid image URL");

        var response = await httpClient.GetAsync(uri);
        var content = await response.Content.ReadAsByteArrayAsync();

        return Results.File(content, response.Content.Headers.ContentType?.MediaType);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapControllers();
app.Run();
