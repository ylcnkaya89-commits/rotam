' Rotam - Silent Windows Desktop Launcher
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strAppDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strHtmlPath = strAppDir & "\index.html"
strServerPath = strAppDir & "\server.py"

' Check if Python is available to run local server
bHasPython = False
On Error Resume Next
iReturn = objShell.Run("python --version", 0, True)
If iReturn = 0 Then
    bHasPython = True
Else
    iReturn = objShell.Run("py --version", 0, True)
    If iReturn = 0 Then bHasPython = True
End If
On Error GoTo 0

' Start local microserver silently if Python exists
If bHasPython Then
    objShell.Run "cmd /c set ROTAM_NO_BROWSER=1 && python """ & strServerPath & """", 0, False
    WScript.Sleep 600
    strTargetUrl = "http://127.0.0.1:14832"
Else
    strTargetUrl = "file:///" & Replace(strHtmlPath, "\", "/")
End If

' Launch in standalone desktop window mode (Edge -> Chrome -> Default)
strEdge1 = objShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe")
strEdge2 = objShell.ExpandEnvironmentStrings("%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
strChrome = objShell.ExpandEnvironmentStrings("%ProgramFiles%\Google\Chrome\Application\chrome.exe")
strChromeUser = objShell.ExpandEnvironmentStrings("%LocalAppData%\Google\Chrome\Application\chrome.exe")

If objFSO.FileExists(strEdge1) Then
    objShell.Run """" & strEdge1 & """ --app=""" & strTargetUrl & """ --window-size=1280,820", 1, False
ElseIf objFSO.FileExists(strEdge2) Then
    objShell.Run """" & strEdge2 & """ --app=""" & strTargetUrl & """ --window-size=1280,820", 1, False
ElseIf objFSO.FileExists(strChrome) Then
    objShell.Run """" & strChrome & """ --app=""" & strTargetUrl & """ --window-size=1280,820", 1, False
ElseIf objFSO.FileExists(strChromeUser) Then
    objShell.Run """" & strChromeUser & """ --app=""" & strTargetUrl & """ --window-size=1280,820", 1, False
Else
    objShell.Run """" & strTargetUrl & """", 1, False
End If
