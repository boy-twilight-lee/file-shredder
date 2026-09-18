using Microsoft.Win32;
using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace FileShredderInstaller
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    internal sealed class InstallerForm : Form
    {
        private const string AppGuid = "3c44ebff-7040-5bce-bd60-a2a2ef9aaa03";
        private const string ApplicationName = "文件粉碎精灵";
        private const string ProductExecutable = "文件粉碎精灵.exe";
        private const int WindowCornerRadius = 18;

        private readonly TextBox installationPathTextBox;
        private readonly CheckBox desktopShortcutCheckBox;
        private readonly CheckBox startupCheckBox;
        private readonly RoundedButton installButton;
        private readonly RoundedButton cancelButton;
        private readonly ProgressBar progressBar;
        private readonly Label statusLabel;
        private readonly string defaultInstallDirectory;
        private bool installationCompleted;
        private Point dragOrigin;

        public InstallerForm()
        {
            defaultInstallDirectory = GetDefaultInstallDirectory();
            installationPathTextBox = CreatePathTextBox(defaultInstallDirectory);
            desktopShortcutCheckBox = CreateOptionCheckBox("创建桌面快捷方式", true);
            startupCheckBox = CreateOptionCheckBox("开机时自动启动文件粉碎精灵", false);
            installButton = CreatePrimaryButton();
            cancelButton = CreateSecondaryButton();
            progressBar = CreateProgressBar();
            statusLabel = CreateStatusLabel();

            InitializeWindow();
            BuildInterface();
        }

        protected override void OnPaintBackground(PaintEventArgs eventArgs)
        {
            using (LinearGradientBrush brush = new LinearGradientBrush(
                ClientRectangle,
                Color.FromArgb(244, 250, 255),
                Color.FromArgb(224, 242, 255),
                LinearGradientMode.Vertical))
            {
                eventArgs.Graphics.FillRectangle(brush, ClientRectangle);
            }
        }

        protected override void OnResize(EventArgs eventArgs)
        {
            base.OnResize(eventArgs);
            using (GraphicsPath path = RoundedControl.CreateRoundedPath(ClientRectangle, WindowCornerRadius))
            {
                Region = new Region(path);
            }
        }

        private void InitializeWindow()
        {
            AutoScaleMode = AutoScaleMode.Dpi;
            BackColor = Color.FromArgb(244, 250, 255);
            ClientSize = new Size(920, 650);
            DoubleBuffered = true;
            Font = new Font("Microsoft YaHei UI", 10F, FontStyle.Regular, GraphicsUnit.Point);
            FormBorderStyle = FormBorderStyle.None;
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            MaximizeBox = false;
            MinimizeBox = true;
            StartPosition = FormStartPosition.CenterScreen;
            Text = ApplicationName + " 安装";
        }

        private void BuildInterface()
        {
            Controls.Add(CreateTitleBar());
            Controls.Add(CreateHeroPanel());
            Controls.Add(CreateOptionsCard());
        }

        private Control CreateTitleBar()
        {
            Panel titleBar = new Panel
            {
                BackColor = Color.FromArgb(250, 253, 255),
                Dock = DockStyle.Top,
                Height = 52,
            };
            titleBar.MouseDown += HandleTitleBarMouseDown;
            titleBar.MouseMove += HandleTitleBarMouseMove;

            PictureBox iconView = new PictureBox
            {
                Image = LoadEmbeddedImage("Installer.Logo"),
                Location = new Point(20, 10),
                Size = new Size(32, 32),
                SizeMode = PictureBoxSizeMode.Zoom,
            };
            Label title = new Label
            {
                AutoSize = true,
                Font = new Font("Microsoft YaHei UI", 11F, FontStyle.Regular),
                ForeColor = Color.FromArgb(20, 34, 52),
                Location = new Point(58, 16),
                Text = ApplicationName + "  安装",
            };
            Button minimizeButton = CreateWindowButton("—");
            minimizeButton.Location = new Point(824, 8);
            minimizeButton.Click += delegate { WindowState = FormWindowState.Minimized; };
            Button closeButton = CreateWindowButton("×");
            closeButton.Font = new Font("Microsoft YaHei UI", 20F, FontStyle.Regular);
            closeButton.Location = new Point(870, 8);
            closeButton.Click += delegate { Close(); };

            titleBar.Controls.Add(iconView);
            titleBar.Controls.Add(title);
            titleBar.Controls.Add(minimizeButton);
            titleBar.Controls.Add(closeButton);
            return titleBar;
        }

        private Control CreateHeroPanel()
        {
            HeroPanel heroPanel = new HeroPanel
            {
                Location = new Point(0, 52),
                Size = new Size(920, 220),
            };
            Label heading = new Label
            {
                AutoSize = true,
                BackColor = Color.Transparent,
                Font = new Font("Microsoft YaHei UI", 27F, FontStyle.Bold),
                ForeColor = Color.FromArgb(10, 28, 54),
                Location = new Point(56, 54),
                Text = "安装 " + ApplicationName,
            };
            Label description = new Label
            {
                AutoSize = true,
                BackColor = Color.Transparent,
                Font = new Font("Microsoft YaHei UI", 15F, FontStyle.Regular),
                ForeColor = Color.FromArgb(91, 107, 130),
                Location = new Point(58, 112),
                Text = "安全清理文件，让桌面保持轻盈整洁",
            };
            PictureBox mascot = new PictureBox
            {
                BackColor = Color.Transparent,
                Image = LoadEmbeddedImage("Installer.Logo"),
                Location = new Point(530, 4),
                Size = new Size(276, 216),
                SizeMode = PictureBoxSizeMode.Zoom,
            };
            Label slogan = new Label
            {
                AutoSize = false,
                BackColor = Color.Transparent,
                Font = new Font("Microsoft YaHei UI", 10F, FontStyle.Regular),
                ForeColor = Color.FromArgb(58, 121, 202),
                Location = new Point(790, 66),
                Size = new Size(110, 62),
                Text = "不需要的文件，\r\n彻底消失！",
                TextAlign = ContentAlignment.MiddleCenter,
            };

            heroPanel.Controls.Add(heading);
            heroPanel.Controls.Add(description);
            heroPanel.Controls.Add(mascot);
            heroPanel.Controls.Add(slogan);
            return heroPanel;
        }

        private Control CreateOptionsCard()
        {
            RoundedPanel card = new RoundedPanel
            {
                BackColor = Color.FromArgb(252, 254, 255),
                BorderColor = Color.FromArgb(225, 235, 246),
                CornerRadius = 20,
                Location = new Point(32, 270),
                Size = new Size(856, 348),
            };
            Label locationTitle = CreateSectionTitle("安装位置", new Point(34, 30));
            RoundedPanel pathContainer = new RoundedPanel
            {
                BackColor = Color.White,
                BorderColor = Color.FromArgb(205, 215, 228),
                CornerRadius = 10,
                Location = new Point(34, 68),
                Size = new Size(650, 50),
            };
            installationPathTextBox.Location = new Point(16, 13);
            installationPathTextBox.Size = new Size(618, 28);
            pathContainer.Controls.Add(installationPathTextBox);

            RoundedButton browseButton = new RoundedButton
            {
                BackColor = Color.FromArgb(248, 250, 253),
                BorderColor = Color.FromArgb(205, 215, 228),
                CornerRadius = 10,
                FlatAppearance = { BorderSize = 0 },
                Font = new Font("Microsoft YaHei UI", 11F, FontStyle.Regular),
                ForeColor = Color.FromArgb(20, 34, 52),
                Location = new Point(700, 68),
                Size = new Size(122, 50),
                Text = "浏览...",
                UseVisualStyleBackColor = false,
            };
            browseButton.Click += HandleBrowseClick;

            Label optionTitle = CreateSectionTitle("快捷选项", new Point(34, 134));
            desktopShortcutCheckBox.Location = new Point(34, 170);
            startupCheckBox.Location = new Point(34, 202);

            Label note = new Label
            {
                AutoSize = true,
                Font = new Font("Microsoft YaHei UI", 9.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(117, 132, 151),
                Location = new Point(34, 287),
                Text = "安装后可在应用设置中随时修改开机启动选项",
            };

            installButton.Location = new Point(566, 274);
            cancelButton.Location = new Point(730, 274);
            progressBar.Location = new Point(34, 260);
            statusLabel.Location = new Point(34, 286);

            card.Controls.Add(locationTitle);
            card.Controls.Add(pathContainer);
            card.Controls.Add(browseButton);
            card.Controls.Add(optionTitle);
            card.Controls.Add(desktopShortcutCheckBox);
            card.Controls.Add(startupCheckBox);
            card.Controls.Add(note);
            card.Controls.Add(progressBar);
            card.Controls.Add(statusLabel);
            card.Controls.Add(installButton);
            card.Controls.Add(cancelButton);
            return card;
        }

        private static TextBox CreatePathTextBox(string initialPath)
        {
            return new TextBox
            {
                BackColor = Color.White,
                BorderStyle = BorderStyle.None,
                Font = new Font("Microsoft YaHei UI", 11F, FontStyle.Regular),
                ForeColor = Color.FromArgb(20, 34, 52),
                Text = initialPath,
            };
        }

        private static CheckBox CreateOptionCheckBox(string text, bool isChecked)
        {
            return new CheckBox
            {
                AutoSize = true,
                Checked = isChecked,
                Font = new Font("Microsoft YaHei UI", 10.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(20, 34, 52),
                Size = new Size(320, 26),
                Text = text,
                UseVisualStyleBackColor = true,
            };
        }

        private RoundedButton CreatePrimaryButton()
        {
            RoundedButton button = new RoundedButton
            {
                BackColor = Color.FromArgb(22, 119, 255),
                BorderColor = Color.FromArgb(22, 119, 255),
                CornerRadius = 10,
                FlatAppearance = { BorderSize = 0 },
                Font = new Font("Microsoft YaHei UI", 11F, FontStyle.Bold),
                ForeColor = Color.White,
                Size = new Size(148, 52),
                Text = "立即安装",
                UseVisualStyleBackColor = false,
            };
            button.Click += HandleInstallClick;
            return button;
        }

        private RoundedButton CreateSecondaryButton()
        {
            RoundedButton button = new RoundedButton
            {
                BackColor = Color.FromArgb(248, 250, 253),
                BorderColor = Color.FromArgb(205, 215, 228),
                CornerRadius = 10,
                FlatAppearance = { BorderSize = 0 },
                Font = new Font("Microsoft YaHei UI", 11F, FontStyle.Regular),
                ForeColor = Color.FromArgb(20, 34, 52),
                Size = new Size(92, 52),
                Text = "取消",
                UseVisualStyleBackColor = false,
            };
            button.Click += delegate { Close(); };
            return button;
        }

        private static ProgressBar CreateProgressBar()
        {
            return new ProgressBar
            {
                MarqueeAnimationSpeed = 24,
                Size = new Size(500, 8),
                Style = ProgressBarStyle.Marquee,
                Visible = false,
            };
        }

        private static Label CreateStatusLabel()
        {
            return new Label
            {
                AutoSize = true,
                Font = new Font("Microsoft YaHei UI", 9.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(73, 103, 139),
                Text = "正在安装，请稍候...",
                Visible = false,
            };
        }

        private static Label CreateSectionTitle(string text, Point location)
        {
            return new Label
            {
                AutoSize = true,
                Font = new Font("Microsoft YaHei UI", 12F, FontStyle.Bold),
                ForeColor = Color.FromArgb(14, 48, 88),
                Location = location,
                Text = text,
            };
        }

        private static Button CreateWindowButton(string text)
        {
            return new Button
            {
                BackColor = Color.Transparent,
                Cursor = Cursors.Hand,
                FlatAppearance = { BorderSize = 0, MouseOverBackColor = Color.FromArgb(235, 243, 251) },
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Microsoft YaHei UI", 14F, FontStyle.Regular),
                ForeColor = Color.FromArgb(53, 70, 92),
                Size = new Size(42, 36),
                Text = text,
                UseVisualStyleBackColor = false,
            };
        }

        private static string GetDefaultInstallDirectory()
        {
            using (RegistryKey key = Registry.CurrentUser.OpenSubKey("Software\\" + AppGuid))
            {
                string existingPath = key == null ? null : key.GetValue("InstallLocation") as string;
                if (!string.IsNullOrWhiteSpace(existingPath)) return existingPath;
            }
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs",
                "file-shredder");
        }

        private static Image LoadEmbeddedImage(string resourceName)
        {
            Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName);
            if (stream == null) return null;
            using (stream)
            using (Image image = Image.FromStream(stream))
            {
                return new Bitmap(image);
            }
        }

        private void HandleTitleBarMouseDown(object sender, MouseEventArgs eventArgs)
        {
            if (eventArgs.Button == MouseButtons.Left) dragOrigin = eventArgs.Location;
        }

        private void HandleTitleBarMouseMove(object sender, MouseEventArgs eventArgs)
        {
            if (eventArgs.Button != MouseButtons.Left) return;
            Point screenPoint = ((Control)sender).PointToScreen(eventArgs.Location);
            Location = new Point(screenPoint.X - dragOrigin.X, screenPoint.Y - dragOrigin.Y);
        }

        private void HandleBrowseClick(object sender, EventArgs eventArgs)
        {
            using (FolderBrowserDialog dialog = new FolderBrowserDialog())
            {
                dialog.Description = "选择文件粉碎精灵的安装位置";
                dialog.SelectedPath = Directory.Exists(installationPathTextBox.Text)
                    ? installationPathTextBox.Text
                    : defaultInstallDirectory;
                if (dialog.ShowDialog(this) == DialogResult.OK)
                    installationPathTextBox.Text = dialog.SelectedPath;
            }
        }

        private async void HandleInstallClick(object sender, EventArgs eventArgs)
        {
            if (installationCompleted)
            {
                LaunchInstalledApplication();
                Close();
                return;
            }

            string installDirectory = installationPathTextBox.Text.Trim();
            if (!ValidateInstallDirectory(installDirectory)) return;
            SetInstallingState(true);
            try
            {
                int exitCode = await RunInstallerCoreAsync(installDirectory);
                if (exitCode != 0) throw new InvalidOperationException("安装核心返回错误码 " + exitCode + "。");
                installationCompleted = true;
                installButton.Text = "立即体验";
                cancelButton.Text = "关闭";
                progressBar.Style = ProgressBarStyle.Continuous;
                progressBar.MarqueeAnimationSpeed = 0;
                progressBar.Value = 100;
                statusLabel.Text = "安装完成，可以开始使用文件粉碎精灵。";
                statusLabel.ForeColor = Color.FromArgb(29, 145, 87);
                installButton.Enabled = true;
                cancelButton.Enabled = true;
            }
            catch (Exception error)
            {
                SetInstallingState(false);
                MessageBox.Show(this, error.Message, "安装失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private bool ValidateInstallDirectory(string installDirectory)
        {
            if (string.IsNullOrWhiteSpace(installDirectory))
            {
                MessageBox.Show(this, "请选择安装位置。", "安装位置", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return false;
            }
            try
            {
                string fullPath = Path.GetFullPath(installDirectory);
                string rootPath = Path.GetPathRoot(fullPath);
                if (string.Equals(fullPath.TrimEnd('\\'), rootPath.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("不能直接安装到磁盘根目录，请选择一个应用文件夹。");
                installationPathTextBox.Text = fullPath.TrimEnd('\\');
                return true;
            }
            catch (Exception error)
            {
                MessageBox.Show(this, error.Message, "安装位置无效", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return false;
            }
        }

        private void SetInstallingState(bool isInstalling)
        {
            installationPathTextBox.Enabled = !isInstalling;
            desktopShortcutCheckBox.Enabled = !isInstalling;
            startupCheckBox.Enabled = !isInstalling;
            installButton.Enabled = !isInstalling;
            cancelButton.Enabled = !isInstalling;
            progressBar.Visible = isInstalling;
            statusLabel.Visible = isInstalling;
        }

        private async Task<int> RunInstallerCoreAsync(string installDirectory)
        {
            string corePath = Path.Combine(Path.GetTempPath(), "file-shredder-installer-" + Guid.NewGuid().ToString("N") + ".exe");
            try
            {
                using (Stream resource = Assembly.GetExecutingAssembly().GetManifestResourceStream("Installer.Core"))
                {
                    if (resource == null) throw new InvalidOperationException("安装核心资源缺失。");
                    using (FileStream output = new FileStream(corePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                        await resource.CopyToAsync(output);
                }

                string desktopOption = desktopShortcutCheckBox.Checked ? "1" : "0";
                string startupOption = startupCheckBox.Checked ? "true" : "false";
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    Arguments = "/S /desktop-shortcut=" + desktopOption + " /startup=" + startupOption + " /D=" + installDirectory,
                    CreateNoWindow = true,
                    FileName = corePath,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden,
                };
                using (Process process = Process.Start(startInfo))
                {
                    if (process == null) throw new InvalidOperationException("无法启动安装核心。");
                    await Task.Run(delegate { process.WaitForExit(); });
                    return process.ExitCode;
                }
            }
            finally
            {
                try { if (File.Exists(corePath)) File.Delete(corePath); }
                catch { }
            }
        }

        private void LaunchInstalledApplication()
        {
            string executablePath = Path.Combine(installationPathTextBox.Text.Trim(), ProductExecutable);
            if (!File.Exists(executablePath)) return;
            Process.Start(new ProcessStartInfo
            {
                FileName = executablePath,
                UseShellExecute = true,
            });
        }
    }

    internal class RoundedControl : Control
    {
        public int CornerRadius { get; set; }
        public Color BorderColor { get; set; }

        public RoundedControl()
        {
            CornerRadius = 10;
            BorderColor = Color.Transparent;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint, true);
        }

        public static GraphicsPath CreateRoundedPath(Rectangle bounds, int radius)
        {
            int diameter = Math.Max(1, radius * 2);
            Rectangle arc = new Rectangle(bounds.X, bounds.Y, diameter, diameter);
            GraphicsPath path = new GraphicsPath();
            path.AddArc(arc, 180, 90);
            arc.X = bounds.Right - diameter;
            path.AddArc(arc, 270, 90);
            arc.Y = bounds.Bottom - diameter;
            path.AddArc(arc, 0, 90);
            arc.X = bounds.Left;
            path.AddArc(arc, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    internal sealed class RoundedPanel : Panel
    {
        public int CornerRadius { get; set; }
        public Color BorderColor { get; set; }

        public RoundedPanel()
        {
            CornerRadius = 10;
            BorderColor = Color.Transparent;
            DoubleBuffered = true;
        }

        protected override void OnPaint(PaintEventArgs eventArgs)
        {
            eventArgs.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle bounds = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath path = RoundedControl.CreateRoundedPath(bounds, CornerRadius))
            using (SolidBrush brush = new SolidBrush(BackColor))
            using (Pen pen = new Pen(BorderColor))
            {
                eventArgs.Graphics.FillPath(brush, path);
                if (BorderColor != Color.Transparent) eventArgs.Graphics.DrawPath(pen, path);
                Region = new Region(path);
            }
            base.OnPaint(eventArgs);
        }
    }

    internal sealed class RoundedButton : Button
    {
        public int CornerRadius { get; set; }
        public Color BorderColor { get; set; }

        public RoundedButton()
        {
            CornerRadius = 10;
            BorderColor = Color.Transparent;
            Cursor = Cursors.Hand;
            FlatStyle = FlatStyle.Flat;
        }

        protected override void OnPaint(PaintEventArgs eventArgs)
        {
            eventArgs.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle bounds = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath path = RoundedControl.CreateRoundedPath(bounds, CornerRadius))
            using (SolidBrush brush = new SolidBrush(Enabled ? BackColor : Color.FromArgb(184, 203, 226)))
            using (Pen pen = new Pen(BorderColor))
            {
                eventArgs.Graphics.FillPath(brush, path);
                if (BorderColor != Color.Transparent) eventArgs.Graphics.DrawPath(pen, path);
                TextRenderer.DrawText(
                    eventArgs.Graphics,
                    Text,
                    Font,
                    bounds,
                    Enabled ? ForeColor : Color.White,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
                Region = new Region(path);
            }
        }
    }

    internal sealed class HeroPanel : Panel
    {
        public HeroPanel()
        {
            DoubleBuffered = true;
        }

        protected override void OnPaintBackground(PaintEventArgs eventArgs)
        {
            using (LinearGradientBrush brush = new LinearGradientBrush(
                ClientRectangle,
                Color.FromArgb(248, 252, 255),
                Color.FromArgb(220, 241, 255),
                LinearGradientMode.Horizontal))
            {
                eventArgs.Graphics.FillRectangle(brush, ClientRectangle);
            }
            eventArgs.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (SolidBrush accent = new SolidBrush(Color.FromArgb(42, 126, 205, 255)))
            {
                eventArgs.Graphics.FillEllipse(accent, new Rectangle(660, -130, 330, 330));
                eventArgs.Graphics.FillEllipse(accent, new Rectangle(-90, 120, 260, 180));
            }
        }
    }
}
