Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = "C:\Users\Cirunay\Desktop\mcPack\lives"
$distDir = Join-Path $baseDir "dist"
$tempDir = Join-Path $baseDir "dist\temp"

if (Test-Path $distDir) {
    Remove-Item -Recurse -Force $distDir
}
New-Item -ItemType Directory -Force -Path $distDir | Out-Null
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$bpSource = Join-Path $baseDir "BP"
$rpSource = Join-Path $baseDir "RP"

$bpPack = Join-Path $distDir "LAST_LIFE_BP.mcpack"
$rpPack = Join-Path $distDir "LAST_LIFE_RP.mcpack"
$finalAddon = Join-Path $distDir "LAST-LIFE.mcaddon"

Write-Output "Building LAST LIFE Behavior Pack (.mcpack)..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($bpSource, $bpPack)

Write-Output "Building LAST LIFE Resource Pack (.mcpack)..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($rpSource, $rpPack)

# Copy both mcpack files into tempDir to build .mcaddon
Copy-Item $bpPack (Join-Path $tempDir "LAST LIFE (Behavior).mcpack")
Copy-Item $rpPack (Join-Path $tempDir "LAST LIFE (Resource).mcpack")

Write-Output "Packaging final distributable LAST-LIFE.mcaddon..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $finalAddon)

# Clean up temp directory
Remove-Item -Recurse -Force $tempDir

Write-Output "Add-on successfully built at: $finalAddon"
Write-Output "Size: $((Get-Item $finalAddon).Length) bytes"
