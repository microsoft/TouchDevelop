using Microsoft.Win32;
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Security;
using System.Threading;
using System.Windows.Forms;

namespace Microsoft.MicroBit
{
    internal partial class MainForm : Form
    {
        FileSystemWatcher watcher;

        public MainForm()
        {
            InitializeComponent();
            var v = typeof(MainForm).Assembly.GetName().Version;
            this.versionLabel.Text = "v" + v.Major + "." + v.Minor;
        }

        private void MainForm_Load(object sender, EventArgs e)
        {
            this.initializeFileWatch();
        }

        private void initializeFileWatch()
        {
            if (!checkTOU()) return;

            var downloads = KnownFoldersNativeMethods.GetDownloadPath();
            if (downloads == null)
            {
                this.updateStatus("oops, can't find the Downloads folder");
                return;
            }

            this.watcher = new FileSystemWatcher(downloads);
            this.watcher.Renamed += (sender, e) => this.handleFileEvent(e);
            this.watcher.Created += (sender, e) => this.handleFileEvent(e);
            this.watcher.EnableRaisingEvents = true;

            this.waitingForHexFileStatus();
            try
            {
                Process.Start("https://www.microbit.co.uk/app/#");
            }
            catch (IOException) { }
        }

        private void waitingForHexFileStatus()
        {
            this.updateStatus("waiting for .hex file...");
            this.trayIcon.ShowBalloonTip(3000, "micro:bit uploader ready...", "waiting for .hex file...", ToolTipIcon.None);
        }

        static bool checkTOU()
        {
            var v = (int)Application.UserAppDataRegistry.GetValue("TermOfUse", 0);
            if (v != 1)
            {
                using (var f = new LicenseDialog())
                {
                    var r = f.ShowDialog();
                    if (r != DialogResult.Yes)
                    {
                        Application.Exit();
                        return false;
                    }
                }
                Application.UserAppDataRegistry.SetValue("TermOfUse", 1, RegistryValueKind.DWord);
            }

            return true;
        }

        delegate void Callback();

        private void updateStatus(string value)
        {
            Callback a = (Callback)(() =>
            {
                this.statusLabel.Text = value;
                this.trayIcon.Text = value;
            });
            this.Invoke(a);
        }

        void handleFileEvent(FileSystemEventArgs e)
        {
            this.handleFile(e.FullPath);
        }

        void setBackgroundColor(Color c)
        {
            Callback cb = () => this.BackColor = c;
            this.Invoke(cb);
        }

        volatile int copying;
        void handleFile(string fullPath)
        {
            try
            {
                // In case this is data-url download, at least Chrome will not rename file, but instead write to it
                // directly. This mean we may catch it in the act. Let's leave it some time to finish writing.
                Thread.Sleep(500);

                var info = new System.IO.FileInfo(fullPath);
                Trace.WriteLine("download: " + info.FullName);

                if (info.Extension != ".hex") return;

                var infoName = info.Name;
                Trace.WriteLine("download name: " + info.Name);
                if (!infoName.StartsWith("microbit-", StringComparison.OrdinalIgnoreCase))
                    return;
                if(info.Name.EndsWith(".uploaded.hex", StringComparison.OrdinalIgnoreCase))
                    return;

                // already copying?
                if (Interlocked.Exchange(ref this.copying, 1) == 1)
                    return;
                try
                {

                    this.setBackgroundColor(Color.Yellow);
                    this.updateStatus("detected " + info.Name);
                    var drive = getMicrobitDrive();
                    if (drive == null)
                    {
                        this.updateStatus("no MICROBIT drive detected");
                        this.trayIcon.ShowBalloonTip(3000, "cancelled uploading to micro:bit...", "no MICROBIT drive detected", ToolTipIcon.None);
                        return;
                    }

                    this.trayIcon.ShowBalloonTip(3000, "uploading to micro:bit...", "transferring .hex file", ToolTipIcon.None);
                    this.updateStatus("uploading .hex file (" + info.Length / 1000 + " kb)...");
                    var trg = System.IO.Path.Combine(drive.RootDirectory.FullName, "firmware.hex");
                    File.Copy(info.FullName, trg, true);
                    this.updateStatus("uploading done");

                    var temp = System.IO.Path.ChangeExtension(info.FullName, ".uploaded.hex");
                    try
                    {
                        File.Copy(info.FullName, temp, true);
                        File.Delete(info.FullName);
                    }
                    catch (IOException) { }
                    catch (NotSupportedException) { }
                    catch (UnauthorizedAccessException) { }
                    catch (ArgumentException) { }
                    this.waitingForHexFileStatus();
                }
                finally
                {
                    this.setBackgroundColor(Color.White);
                    Interlocked.Exchange(ref this.copying, 0);
                }
            }
            catch (IOException) { }
            catch (NotSupportedException) { }
            catch (UnauthorizedAccessException) { }
            catch (ArgumentException) { }
        }

        static DriveInfo getMicrobitDrive()
        {
            var drives = System.IO.DriveInfo.GetDrives();
            foreach (var di in drives)
            {
                var label = getVolumeLabel(di);
                if (label.StartsWith("MICROBIT", StringComparison.Ordinal))
                    return di;
            }
            return null;
        }

        static string getVolumeLabel(DriveInfo di)
        {
            try { return di.VolumeLabel; }
            catch (IOException) { }
            catch (SecurityException) { }
            catch (UnauthorizedAccessException) { }
            return "";
        }

        private void trayIcon_Click(object sender, EventArgs e)
        {
            this.WindowState = FormWindowState.Minimized;
            this.WindowState = FormWindowState.Normal;
            this.Show();
            this.Activate();
        }

        private void versionLabel_LinkClicked(object sender, LinkLabelLinkClickedEventArgs e)
        {
            Process.Start("https://www.touchdevelop.com/microbit");
        }
    }
}
