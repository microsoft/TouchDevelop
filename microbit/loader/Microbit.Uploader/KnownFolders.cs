using System;
using System.Diagnostics.CodeAnalysis;
using System.Management;
using System.Runtime.InteropServices;
using System.Security;

namespace Microsoft.MicroBit
{
    /// <summary>
    /// Class containing methods to retrieve specific file system paths.
    /// </summary>
    internal static class KnownFoldersNativeMethods
    {
        [SecurityCritical]
        [SuppressMessage("Microsoft.Design", "CA1024:UsePropertiesWhereAppropriate")]
        public static string GetDownloadPath()
        {
            IntPtr outPath;
            int result = SHGetKnownFolderPath(new Guid("{374DE290-123F-4565-9164-39C4925E467B}"), 0x00004000, new IntPtr(0), out outPath);
            if (result >= 0)
                return Marshal.PtrToStringUni(outPath);
            else return null;
        }

        [SuppressMessage("Microsoft.Security", "CA5122:PInvokesShouldNotBeSafeCriticalFxCopRule")]
        [DllImport("Shell32.dll")]
        [SecurityCritical]
        private static extern int SHGetKnownFolderPath(
            [MarshalAs(UnmanagedType.LPStruct)]Guid rfid, uint dwFlags, IntPtr hToken,
            out IntPtr ppszPath);
    }

}