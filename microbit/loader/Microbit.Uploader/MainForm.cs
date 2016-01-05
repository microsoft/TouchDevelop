using Microsoft.Win32;
using System;
using System.Collections.Generic;
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
        private string customcopypath="";

        public MainForm()
        {
            InitializeComponent();
            var v = typeof(MainForm).Assembly.GetName().Version;
            this.versionLabel.Text = "v" + v.Major + "." + v.Minor;
        }

        private void MainForm_Load(object sender, EventArgs e)
        {
            this.initializeFileWatch();
            customcopypath=(string)Application.UserAppDataRegistry.GetValue("CustomDirectory","");
            if (DateTime.Now > new DateTime(2016, 8, 1))
                this.backgroundPictureBox.Visible = false;
        }

        private void initializeFileWatch()
        {
            if (!checkTOU()) return;

            var downloads = KnownFoldersNativeMethods.GetDownloadPath();
            if (downloads == null)
            {
                this.updateStatus("oops, can't find the `Downloads` folder");
                return;
            }

            this.watcher = new FileSystemWatcher(downloads);
            this.watcher.Renamed += (sender, e) => this.handleFileEvent(e);
            this.watcher.Created += (sender, e) => this.handleFileEvent(e);
            this.watcher.EnableRaisingEvents = true;

            this.waitingForHexFileStatus();
        }

        private void waitingForHexFileStatus()
        {
            this.updateStatus("waiting for .hex file...");
            this.trayIcon.ShowBalloonTip(3000, "ready...", "waiting for .hex file...", ToolTipIcon.None);
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
                if (!infoName.StartsWith("microbit-", StringComparison.OrdinalIgnoreCase)) return;
                if(info.Name.EndsWith(".uploaded.hex", StringComparison.OrdinalIgnoreCase)) return;
                if (info.Length > 1000000) return; // make sure we don't try to copy large files
               

                // already copying?
                if (Interlocked.Exchange(ref this.copying, 1) == 1)
                    return;

                try
                {

                    var driveletters = getMicrobitDrives();
                    List<String>drives = new List<String>();
                    foreach (var d in driveletters)
                    {
                        drives.Add(d.RootDirectory.FullName);
                    }
                    if (!String.IsNullOrEmpty(customcopypath) && Directory.Exists(customcopypath))
                    {
                        drives.Add(customcopypath);
                    }
                    if (drives.Count == 0)
                    {
                        this.updateStatus("no board found");
                        this.trayIcon.ShowBalloonTip(3000, "cancelled uploading...", "no board found", ToolTipIcon.None);
                        return;
                    }

                    this.updateStatus("uploading .hex file");
                    this.trayIcon.ShowBalloonTip(3000, "uploading...", "uploading .hex file", ToolTipIcon.None);

                    // copy to all boards
                    copyFirmware(info.FullName, drives);
                    
                    // move away hex file
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
                    
                    // update ui
                    this.updateStatus("uploading done");
                    this.waitingForHexFileStatus();
                }
                finally
                {
                    Interlocked.Exchange(ref this.copying, 0);
                }
            }
            catch (IOException) { }
            catch (NotSupportedException) { }
            catch (UnauthorizedAccessException) { }
            catch (ArgumentException) { }
        }

        static void copyFirmware(string file, List<string> drives)
        {
            var waitHandles = new List<WaitHandle>();
            foreach (var drive in drives)
            {
                var ev = new AutoResetEvent(false);
                waitHandles.Add(ev);
                ThreadPool.QueueUserWorkItem((state) =>
                {
                    try
                    {
                        var trg = System.IO.Path.Combine(drive, "firmware.hex");
                        File.Copy(file, trg, true);
                    }
                    catch (IOException) { }
                    catch (NotSupportedException) { }
                    catch (UnauthorizedAccessException) { }
                    catch (ArgumentException) { }
                    ev.Set();
                }, ev);
            }

            //waits for all the threads (waitHandles) to call the .Set() method
            //and inform that the execution has finished.
            WaitHandle.WaitAll(waitHandles.ToArray());
        }

        static DriveInfo[] getMicrobitDrives()
        {
            var drives = System.IO.DriveInfo.GetDrives();
            var r = new System.Collections.Generic.List<DriveInfo>();
            foreach (var di in drives)
            {
                var label = getVolumeLabel(di);
                if (label.StartsWith("MICROBIT", StringComparison.Ordinal))
                    r.Add(di);
            }
            return r.ToArray();
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
            try
            {
                Process.Start("https://www.touchdevelop.com/microbituploader");
            }
            catch (IOException) { }
        }

        private void backgroundPictureBox_Click(object sender, EventArgs e)
        {
            try {
                Process.Start("https://www.touchdevelop.com/microbit");
            } catch (IOException) { }
        }

        private void SettingsLabel_LinkClicked(object sender, LinkLabelLinkClickedEventArgs e)
        {
            var settings = new Settings(customcopypath);
            settings.ShowDialog();
            customcopypath = settings.CustomCopyPath;
            Application.UserAppDataRegistry.SetValue("CustomDirectory", customcopypath, RegistryValueKind.String);
        }
    }
}
