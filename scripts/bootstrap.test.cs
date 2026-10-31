using System;
using System.Collections.Generic;

internal static class BootstrapTests
{
    private static Dictionary<string, object> Release(string tag, bool prerelease, bool draft)
    {
        return new Dictionary<string, object> { { "tag_name", tag }, { "prerelease", prerelease }, { "draft", draft } };
    }

    private static void Assert(bool value)
    {
        if (!value) throw new Exception("Bootstrap-regressietest mislukt.");
    }

    private static void Main()
    {
        var releases = new object[] {
            Release("v2026.10.31.12.00", false, false),
            Release("v2026.11.01.12.00-beta", true, false),
            Release("v2026.12.01.12.00", false, true),
            Release("v2026.11.01.10.00", false, false),
        };
        Assert(Bootstrap.NewestRelease(releases, null, false) == "v2026.11.01.10.00");
        Assert(Bootstrap.NewestRelease(releases, null, true) == "v2026.11.01.12.00-beta");
        Assert(Bootstrap.NewestRelease(new object[] { Release("v2026.10.01.12.00", false, false) },
            "v2026.11.01.10.00", false) == "v2026.11.01.10.00");
        Assert(Bootstrap.NewestRelease(new object[] { Release("v2026.11.01.12.00-beta", true, false) }, null, false) == null);
        Assert(Bootstrap.NewestRelease(new object[] { Release("v2026.11.01.12.00", false, false) }, null, true) == null);
        var checksum = Convert.ToBase64String(new byte[64]);
        Assert(Bootstrap.InstallerMetadata("path: MKS-Dashboard-Setup-2026.10.31.12.00-stable.exe\nsha512: " + checksum)[0]
            == "MKS-Dashboard-Setup-2026.10.31.12.00-stable.exe");
        foreach (var path in new[] { "../evil.exe", "https://evil.test/setup.exe", "unknown.exe" })
        {
            try { Bootstrap.InstallerMetadata("path: " + path + "\nsha512: " + checksum); }
            catch (System.IO.InvalidDataException) { continue; }
            throw new Exception("Ongeldig installerpad geaccepteerd.");
        }
        try { Bootstrap.InstallerMetadata("path: MKS-Dashboard-Setup-stable.exe\nsha512: AAAA"); }
        catch (System.IO.InvalidDataException) { Console.WriteLine("Bootstrap-tests geslaagd."); return; }
        throw new Exception("Ongeldige checksum geaccepteerd.");
    }
}
