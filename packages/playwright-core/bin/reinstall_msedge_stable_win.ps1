$url = $args[0]

Write-Host "Downloading Microsoft Edge"
$wc = New-Object net.webclient
$msiInstaller = "$env:temp\microsoft-edge-stable.msi"
$wc.Downloadfile($url, $msiInstaller)

Write-Host "Installing Microsoft Edge"
$arguments = "/i `"$msiInstaller`" /quiet"
Start-Process msiexec.exe -ArgumentList $arguments -Wait
Remove-Item $msiInstaller

$suffix = "\\Microsoft\\Edge\\Application\\msedge.exe"
if (Test-Path "${env:ProgramFiles(x86)}$suffix") {
    (Get-Item "${env:ProgramFiles(x86)}$suffix").VersionInfo
} elseif (Test-Path "${env:ProgramFiles}$suffix") {
    (Get-Item "${env:ProgramFiles}$suffix").VersionInfo
} else {
    write-host "ERROR: failed to install Microsoft Edge"
    exit 1
}