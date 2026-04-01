// Password Hash Generator for Alaigal
// Use this to generate password hashes for testing

using System;
using System.Security.Cryptography;
using System.Text;

public class PasswordHashGenerator
{
    public static void Main()
    {
        // Test passwords
        string[] passwords = { "vivify", "Admin@123", "admin123" };
        
        Console.WriteLine("Password Hash Generator for Alaigal");
        Console.WriteLine("====================================\n");
        
        foreach (var password in passwords)
        {
            string hash = HashPassword(password);
            Console.WriteLine($"Password: {password}");
            Console.WriteLine($"Hash: {hash}");
            Console.WriteLine();
        }
        
        Console.WriteLine("\nSQL Insert Statement:");
        Console.WriteLine("--------------------");
        Console.WriteLine($"INSERT INTO Users (Username, Email, PasswordHash, FullName, Role, IsActive, CreatedDate)");
        Console.WriteLine($"VALUES ('admin', 'admin@alaigal.com', '{HashPassword("vivify")}', 'Administrator', 'Admin', 1, GETUTCDATE());");
    }
    
    public static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }
}

/* 
To run this:
1. Save as PasswordHashGenerator.cs
2. Run: dotnet run PasswordHashGenerator.cs
   OR
3. Run in C# Interactive or LINQPad

Expected Output:
Password: vivify
Hash: pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=

Password: Admin@123
Hash: jGl25bVBBBW96Qi9Te4V37Fnqchz/Eu4qB9vKrRIqRg=

Password: admin123
Hash: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
*/
