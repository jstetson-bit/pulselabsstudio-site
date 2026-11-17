// PulseKey.cs — offline Pulse key check for Windows apps (.NET Framework 4.7+ / .NET 6+, C# 5, no internet).
// Usage: var r = PulseKey.Check(PUBLIC_KEY, pastedKey, "plspdf"); if (r != null) Unlock();
using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

public static class PulseKey
{
    public sealed class Result { public string Product, Order; public long Issued; }

    public static Result Check(string publicRaw, string key, string productId)
    {
        try
        {
            if (key == null) return null;
            Match m = Regex.Match(key.Trim(), @"^PLS1-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$");
            if (!m.Success) return null;
            byte[] pt = B64(publicRaw);
            if (pt.Length != 65 || pt[0] != 4) return null;
            var p = new ECParameters { Curve = ECCurve.NamedCurves.nistP256, Q = new ECPoint { X = Sub(pt, 1, 32), Y = Sub(pt, 33, 32) } };
            using (ECDsa ec = ECDsa.Create(p))
            {
                // .NET checks raw r||s (IEEE P1363), the same format WebCrypto signs in
                if (!ec.VerifyData(Encoding.ASCII.GetBytes(m.Groups[1].Value), B64(m.Groups[2].Value), HashAlgorithmName.SHA256)) return null;
            }
            string json = Encoding.UTF8.GetString(B64(m.Groups[1].Value));
            string prod = Field(json, "p");
            if (productId != null && prod != productId) return null;
            long t; long.TryParse(Field(json, "t"), out t);
            return new Result { Product = prod, Order = Field(json, "o"), Issued = t };
        }
        catch { return null; }
    }
    static string Field(string json, string k) { Match m = Regex.Match(json, "\"" + k + "\"\\s*:\\s*\"?([^\",}]*)"); return m.Success ? m.Groups[1].Value : null; }
    static byte[] Sub(byte[] a, int at, int n) { var o = new byte[n]; Array.Copy(a, at, o, 0, n); return o; }
    static byte[] B64(string s) { s = s.Replace('-', '+').Replace('_', '/'); while (s.Length % 4 != 0) s += "="; return Convert.FromBase64String(s); }
}
