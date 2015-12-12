using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Security.AccessControl;
using System.Text;
using System.Windows.Forms;

namespace Microsoft.MicroBit
{
    public partial class Settings : Form
    {
        public string CustomCopyPath;
        public Settings(string currentpath)
        {
            InitializeComponent();
            CustomCopyPath = currentpath;

        }

        private void Settings_Load(object sender, EventArgs e)
        {
            textBox1.Text = CustomCopyPath;
        }

        private void label1_Click(object sender, EventArgs e)
        {

        }

        private void textBox1_TextChanged(object sender, EventArgs e)
        {
            CustomCopyPath = textBox1.Text;
        }
    }
}
