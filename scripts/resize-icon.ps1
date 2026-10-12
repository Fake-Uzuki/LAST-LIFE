Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Cirunay\Desktop\mcPack\lives\Pfp(1).png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source file $srcPath not found!"
    exit 1
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)
$newSize = 512
$destBmp = New-Object System.Drawing.Bitmap $newSize, $newSize
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$g.DrawImage($srcImg, 0, 0, $newSize, $newSize)

New-Item -ItemType Directory -Force -Path "C:\Users\Cirunay\Desktop\mcPack\lives\BP" | Out-Null
New-Item -ItemType Directory -Force -Path "C:\Users\Cirunay\Desktop\mcPack\lives\RP" | Out-Null

$destBmp.Save("C:\Users\Cirunay\Desktop\mcPack\lives\BP\pack_icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Save("C:\Users\Cirunay\Desktop\mcPack\lives\RP\pack_icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$destBmp.Dispose()
$srcImg.Dispose()

Write-Output "Resized 512x512 pack_icon.png created for BP and RP successfully!"
