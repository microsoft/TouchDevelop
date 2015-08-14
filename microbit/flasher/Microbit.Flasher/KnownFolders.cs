using System;
using System.Management;
using System.Runtime.InteropServices;
using WpfApplication1;

namespace WpfApplication1
{
    /// <summary>
    /// Class containing methods to retrieve specific file system paths.
    /// </summary>
    public static class KnownFoldersNativeMethods
    {
        public static void WatchDrives(Action handler)
        {
            using (var watcher = new ManagementEventWatcher())
            {
                WqlEventQuery query = new WqlEventQuery("SELECT * FROM Win32_VolumeChangeEvent WHERE EventType = 2");
                watcher.EventArrived += (e, sender) => handler();
                watcher.Query = query;
                watcher.Start();
                watcher.WaitForNextEvent();
            }
        }

        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Design", "CA1024:UsePropertiesWhereAppropriate")]
        public static string GetDownloadPath()
        {
            IntPtr outPath;
            int result = SHGetKnownFolderPath(new Guid("{374DE290-123F-4565-9164-39C4925E467B}"), 0x00004000, new IntPtr(0), out outPath);
            if (result >= 0)
                return Marshal.PtrToStringUni(outPath);
            else return null;
        }

        [DllImport("Shell32.dll")]
        private static extern int SHGetKnownFolderPath(
            [MarshalAs(UnmanagedType.LPStruct)]Guid rfid, uint dwFlags, IntPtr hToken,
            out IntPtr ppszPath);
    }

}