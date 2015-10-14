/****************************** Module Header ******************************\
* Module Name:  SingleInstanceAppStarter.cs
* Project:      CSWinFormSingleInstanceApp
* Copyright (c) Microsoft Corporation.
* 
* The  sample demonstrates how to achieve the goal that only 
* one instance of the application is allowed in Windows Forms application..
* 
* This source is subject to the Microsoft Public License.
* See http://www.microsoft.com/en-us/openness/resources/licenses.aspx#MPL.
* All other rights reserved.
* 
* THIS CODE AND INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, 
* EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED 
* WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A PARTICULAR PURPOSE.
\***************************************************************************/

using System;
using System.Windows.Forms;
using Microsoft.VisualBasic.ApplicationServices;

namespace Microsoft.MicroBit
{
    internal static class SingleInstanceAppStarter
    {
        static SingleInstanceApp app = null;

        // Construct SingleInstanceApp object, and invoke its run method.
        public static void Start(Form f, StartupNextInstanceEventHandler handler)
        {
            if (app == null && f != null)
                app = new SingleInstanceApp(f);

            // Wire up StartupNextInstance event handler.
            app.StartupNextInstance += handler;
            app.Run(Environment.GetCommandLineArgs());
        }
    }
}
