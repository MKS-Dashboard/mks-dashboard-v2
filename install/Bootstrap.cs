using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal sealed class Bootstrap : Form
{
#if BETA
    private const bool Beta = true;
    private const string Channel = "Beta";
#else
    private const bool Beta = false;
    private const string Channel = "Stable";
#endif
    private const string Releases = "https://api.github.com/repos/MKS-Dashboard/mks-dashboard-v2/releases";
    private const string Downloads = "https://github.com/MKS-Dashboard/mks-dashboard-v2/releases/download/";
    private readonly Label status = new Label { Left = 28, Top = 110, Width = 440, Height = 70 };
    private readonly ProgressBar progress = new ProgressBar { Left = 28, Top = 190, Width = 440, Height = 12 };
    private readonly Button retry = new Button { Text = "Opnieuw proberen", Left = 28, Top = 224, Width = 150, Visible = false };

    [STAThread]
    private static void Main()
    {
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new Bootstrap());
    }

    private Bootstrap()
    {
        Text = "MKS Dashboard " + Channel + " installeren";
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        ClientSize = new Size(496, 280);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.White;
        Font = new Font("Segoe UI", 10);
        Controls.Add(new Label { Text = "MKS", Left = 28, Top = 24, Width = 70, Height = 40,
            BackColor = Color.FromArgb(215, 45, 53), ForeColor = Color.White, TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI", 16, FontStyle.Bold) });
        Controls.Add(new Label { Text = Text, Left = 28, Top = 78, Width = 440,
            Font = new Font("Segoe UI", 14, FontStyle.Bold) });
        Controls.Add(status);
        Controls.Add(progress);
        Controls.Add(retry);
        retry.Click += delegate { StartInstallation(); };
        Shown += delegate { StartInstallation(); };
    }

    private void Report(string text, int? percent)
    {
        Invoke((Action)delegate {
            status.Text = text;
            progress.Style = percent.HasValue ? ProgressBarStyle.Continuous : ProgressBarStyle.Marquee;
            if (percent.HasValue) progress.Value = Math.Max(0, Math.Min(100, percent.Value));
        });
    }

    private void StartInstallation()
    {
        ControlBox = false;
        retry.Visible = false;
        var worker = new BackgroundWorker();
        worker.DoWork += delegate { Install(); };
        worker.RunWorkerCompleted += delegate(object sender, RunWorkerCompletedEventArgs args) {
            worker.Dispose();
            if (args.Error == null) { Close(); return; }
            Trace.TraceError(args.Error.ToString());
            status.Text = "Installatie mislukt: " + args.Error.Message;
            progress.Style = ProgressBarStyle.Continuous;
            progress.Value = 0;
            ControlBox = true;
            retry.Visible = true;
        };
        worker.RunWorkerAsync();
    }

    internal static string NewestRelease(object[] releases, string previous, bool beta)
    {
        foreach (var value in releases)
        {
            var release = value as Dictionary<string, object>;
            if (release == null || !release.ContainsKey("draft") || !release.ContainsKey("prerelease") ||
                !release.ContainsKey("tag_name")) throw new InvalidDataException("GitHub gaf ongeldige releasegegevens terug.");
            if (!(release["draft"] is bool) || !(release["prerelease"] is bool))
                throw new InvalidDataException("GitHub gaf ongeldige releasegegevens terug.");
            var tag = release["tag_name"] as string;
            if (tag == null) throw new InvalidDataException("GitHub gaf een ongeldige releasetag terug.");
            if ((bool)release["draft"] || (bool)release["prerelease"] != beta ||
                !Regex.IsMatch(tag, beta ? @"^v\d{4}\.\d{2}\.\d{2}\.\d{2}\.\d{2}-beta$" :
                    @"^v\d{4}\.\d{2}\.\d{2}\.\d{2}\.\d{2}$")) continue;
            if (previous == null || String.CompareOrdinal(tag, previous) > 0) previous = tag;
        }
        return previous;
    }

    internal static string[] InstallerMetadata(string yaml)
    {
        var path = Regex.Match(yaml, @"(?m)^path: ([^\r\n]+)\r?$");
        var checksum = Regex.Match(yaml, @"(?m)^sha512: ([A-Za-z0-9+/=]+)\r?$");
        if (!path.Success || !checksum.Success ||
            !Regex.IsMatch(path.Groups[1].Value, @"^MKS-Dashboard-Setup-[A-Za-z0-9._-]+\.exe$") ||
            Convert.FromBase64String(checksum.Groups[1].Value).Length != 64)
            throw new InvalidDataException("De release bevat geen geldige installer of SHA-512-controle.");
        return new[] { path.Groups[1].Value, checksum.Groups[1].Value };
    }

    private static HttpWebRequest Request(string url)
    {
        var request = (HttpWebRequest)WebRequest.Create(url);
        request.UserAgent = "MKS-Dashboard-" + Channel + "-Installer";
        request.Accept = "application/vnd.github+json";
        request.Timeout = 30000;
        request.ReadWriteTimeout = 30000;
        return request;
    }

    private static string FetchText(string url)
    {
        using (var response = Request(url).GetResponse())
        using (var reader = new StreamReader(response.GetResponseStream()))
            return reader.ReadToEnd();
    }

    private void Install()
    {
        Report("Nieuwste " + Channel + "-versie zoeken op GitHub...", null);
        string tag = null;
        var json = new JavaScriptSerializer { MaxJsonLength = 16 * 1024 * 1024 };
        for (int page = 1; ; page++)
        {
            var releases = json.DeserializeObject(FetchText(Releases + "?per_page=100&page=" + page)) as object[];
            if (releases == null) throw new InvalidDataException("GitHub gaf geen releaselijst terug.");
            tag = NewestRelease(releases, tag, Beta);
            if (releases.Length < 100) break;
        }
        if (tag == null) throw new InvalidDataException("Er is nog geen " + Channel + "-release beschikbaar. Probeer het later opnieuw.");
        var baseUrl = Downloads + Uri.EscapeDataString(tag) + "/";
        var metadata = InstallerMetadata(FetchText(baseUrl + (Beta ? "beta.yml" : "latest.yml")));
        var folder = Path.Combine(Path.GetTempPath(), "MKS-Setup-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        var installer = Path.Combine(folder, metadata[0]);
        try
        {
            using (var response = Request(baseUrl + Uri.EscapeDataString(metadata[0])).GetResponse())
            using (var input = response.GetResponseStream())
            using (var output = File.Create(installer))
            {
                byte[] buffer = new byte[65536];
                long total = 0;
                int read;
                int previousPercent = -1;
                Report(Channel + " " + tag.Substring(1) + " downloaden...", null);
                while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
                {
                    output.Write(buffer, 0, read);
                    total += read;
                    int percent = response.ContentLength > 0 ? (int)(100 * total / response.ContentLength) : -1;
                    if (percent != previousPercent)
                    {
                        Report(Channel + " " + tag.Substring(1) + " downloaden: " + percent + "%", percent);
                        previousPercent = percent;
                    }
                }
            }
            Report("Download controleren...", null);
            using (var hash = SHA512.Create())
            using (var file = File.OpenRead(installer))
                if (Convert.ToBase64String(hash.ComputeHash(file)) != metadata[1])
                    throw new InvalidDataException("De download is beschadigd of wijkt af van de GitHub-release. De installer wordt niet gestart.");
            Report("De volledige installer is gestart. Rond de installatie af in dat venster.", null);
            using (var process = Process.Start(new ProcessStartInfo(installer) { UseShellExecute = true }))
            {
                if (process == null) throw new IOException("De volledige installer kon niet worden gestart.");
                process.WaitForExit();
                if (process.ExitCode != 0) throw new IOException("De volledige installer stopte met foutcode " + process.ExitCode + ".");
            }
        }
        finally
        {
            File.Delete(installer);
            Directory.Delete(folder);
        }
    }
}
