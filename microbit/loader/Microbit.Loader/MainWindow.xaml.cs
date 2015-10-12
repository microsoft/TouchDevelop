using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security;
using System.Text;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace Microsoft.MicroBit
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Reliability", "CA2000:Dispose objects before losing scope")]
        public MainWindow()
        {
            InitializeComponent();
            this.DeleteOnUpload = true;
            this.VersionInfo = "v" + typeof(MainWindow).Assembly.GetName().Version.ToString();
            this.updateStatus("uploading...");
            var downloads = KnownFoldersNativeMethods.GetDownloadPath();
            if (downloads == null)
            {
                this.updateStatus("oops, can't find the Downloads folder");
                return;
            }

            var watcher = new FileSystemWatcher(downloads);
            watcher.Renamed += (sender, e) => handleFileEvent(e);
            watcher.Created += (sender, e) => handleFileEvent(e);
            watcher.EnableRaisingEvents = true;

            this.updateStatus("Waiting for .hex file...");
            this.handleActivation();
        }

        private void handleActivation()
        {
            if (AppDomain.CurrentDomain.SetupInformation != null && AppDomain.CurrentDomain.SetupInformation.ActivationArguments != null)
            {
                var ac = AppDomain.CurrentDomain.SetupInformation.ActivationArguments.ActivationData;
                if (ac != null && ac.Length > 0 && !string.IsNullOrEmpty(ac[0]))
                {
                    try
                    {
                        var uri = new Uri(ac[0]);
                        var path = uri.AbsolutePath;
                        ThreadPool.QueueUserWorkItem(data => this.handleFile(path));
                    }
                    catch (ArgumentNullException)
                    { }
                    catch (UriFormatException)
                    { }
                }
            }
        }

        private void updateStatus(string value) {
            Action a = () => { this.Status = value; };
            Application.Current.Dispatcher.Invoke(a);
        }

        public static readonly DependencyProperty VersionInfoProperty = DependencyProperty.Register("VersionInfo", typeof(string), typeof(MainWindow));
        public string VersionInfo
        {
            get { return (string)GetValue(VersionInfoProperty); }
            set { SetValue(VersionInfoProperty, value); }
        }

        public static readonly DependencyProperty StatusProperty = DependencyProperty.Register("Status", typeof(string), typeof(MainWindow));
        public string Status
        {
            get { return (string)GetValue(StatusProperty); }
            set { SetValue(StatusProperty, value); }
        }

        public static readonly DependencyProperty DeleteOnUploadProperty = DependencyProperty.Register("DeleteOnUpload", typeof(bool?), typeof(MainWindow));
        public bool DeleteOnUpload
        {
            get { return (bool)GetValue(DeleteOnUploadProperty); }
            set { SetValue(DeleteOnUploadProperty, value); }
        }

        static string getVolumeLabel(DriveInfo di)
        {
            try { return di.VolumeLabel; }
            catch (IOException) { }
            catch (SecurityException) { }
            catch(UnauthorizedAccessException) {}
            return "";
        }

        void handleFileEvent(FileSystemEventArgs e)
        {
            this.handleFile(e.FullPath);
        }

        void runIOSafe(Action a)
        {
            try
            {
                a();
            }
            catch (IOException) { }
            catch (NotSupportedException) { }
            catch (UnauthorizedAccessException) { }
            catch (ArgumentException) { }
        }

        void handleFile(string fullPath)
        {
            try
            {
	        	// In case this is data-url download, at least Chrome will not rename file, but instead write to it
    	        // directly. This mean we may catch it in the act. Let's leave it some time to finish writing.
                Thread.Sleep(500);

                var info = new System.IO.FileInfo(fullPath);
                if (info.Extension != ".hex" || !info.Name.StartsWith("microbit-", StringComparison.OrdinalIgnoreCase))
                    return;

                this.updateStatus("detected " + info.Name);
                var drives = System.IO.DriveInfo.GetDrives();
                var drive = drives.FirstOrDefault(d => getVolumeLabel(d).StartsWith("MICROBIT", StringComparison.Ordinal));
                if (drive == null)
                {
                    this.updateStatus("no MICROBIT driver detected");
                    return;
                }

                this.updateStatus("uploading " + info.Length + " bytes...");
                var trg = System.IO.Path.Combine(drive.RootDirectory.FullName, "firmware.hex");
                File.Copy(info.FullName, trg, true);
                this.updateStatus("uploading done");

                var del = (bool)Dispatcher.Invoke((Func<Boolean>)(() => this.DeleteOnUpload));
                if (del)
                {
                    var temp = System.IO.Path.ChangeExtension(info.FullName, ".uploaded.hex");
                    runIOSafe(() =>
                    {
                        File.Copy(info.FullName, temp, true);
                        File.Delete(info.FullName);
                    });
                    this.updateStatus("uploading and cleaning done");
                }
                return;
            }
            catch (IOException) { }
            catch (NotSupportedException) { }
            catch (UnauthorizedAccessException) { }
            catch (ArgumentException) { }
            this.updateStatus("oops, something wrong happened");
        }
    }
}
