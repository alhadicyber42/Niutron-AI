$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('C:\Users\hrmla\OneDrive\Desktop\Brahma Echo - Premium.lnk')
$Shortcut.TargetPath = 'D:\DATA PC ALI\CLONE APLIKASI\brahmaai\Brahma-Echo\.venv\Scripts\python.exe'
$Shortcut.Arguments = '"D:\DATA PC ALI\CLONE APLIKASI\brahmaai\Brahma-Echo\main.py"'
$Shortcut.WorkingDirectory = 'D:\DATA PC ALI\CLONE APLIKASI\brahmaai\Brahma-Echo'
$Shortcut.WindowStyle = 7
$Shortcut.Description = 'Launch Brahma Echo - Premium'
if ('D:\DATA PC ALI\CLONE APLIKASI\brahmaai\Brahma-Echo\assets\Brahma_Lite_Logo.ico') { $Shortcut.IconLocation = 'D:\DATA PC ALI\CLONE APLIKASI\brahmaai\Brahma-Echo\assets\Brahma_Lite_Logo.ico,0' }
$Shortcut.Save()