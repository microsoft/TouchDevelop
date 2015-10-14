using Microsoft.VisualBasic.ApplicationServices;
using System;
using System.Windows.Forms;

namespace Microsoft.MicroBit
{
    static class Program
    {
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Reliability", "CA2000:Dispose objects before losing scope")]
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            SingleInstanceAppStarter.Start(new MainForm(), StartNewInstance);
        }

        // The handler when attempting to start another instance of this application
        // We can customize the logic here for which form to activate in different 
        // conditions. Like in this sample, we will be selectively activate the LoginForm
        // or MainForm based on the login state of the user.
        static void StartNewInstance(object sender, StartupNextInstanceEventArgs e)
        {
            e.BringToForeground = true;
        }
    }
}
