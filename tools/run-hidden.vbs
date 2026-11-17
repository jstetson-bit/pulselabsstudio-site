' Starts the build watcher with no window, so nothing flashes on the farm desktop every 2 minutes.
Set sh = CreateObject("WScript.Shell")
here = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & here & "\Watch-Builds.ps1""", 0, True
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & here & "\Watch-Tickets.ps1""", 0, True
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & here & "\Watch-Status.ps1""", 0, True
