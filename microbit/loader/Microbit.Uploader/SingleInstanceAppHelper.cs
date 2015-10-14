/****************************** Module Header ******************************\
* Module Name:  SingleInstanceAppHelper.cs
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
using Microsoft.VisualBasic.ApplicationServices;
using System.Windows.Forms;

namespace Microsoft.MicroBit
{
    // We need to add Microsoft.VisualBasic reference to use
    // WindowsFormsApplicationBase type.
    class SingleInstanceApp : WindowsFormsApplicationBase 
    {
        public SingleInstanceApp()
        {
        }
        public SingleInstanceApp(Form f)
        {
            // Set IsSingleInstance property to true to make the application 
            base.IsSingleInstance = true;
            // Set MainForm of the application.
            this.MainForm = f;
        }
    }
}
