Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root "public\og"
$output = Join-Path $outputDir "rodion-belousov-digital-marketer-vienna.jpg"
$bridgePath = Join-Path $root "public\cases\rodion-belousov-bridge-consult-ai-assisted-web-development-case-study.png"
$fidicPath = Join-Path $root "public\cases\rodion-belousov-fidic-uz-contract-knowledge-platform-design.png"

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$canvas = New-Object System.Drawing.Bitmap 1200, 630
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.Color]::FromArgb(7, 8, 10))

$gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(20, 255, 255, 255)), 1
for ($x = 0; $x -le 1200; $x += 60) { $graphics.DrawLine($gridPen, $x, 0, $x, 630) }
for ($y = 0; $y -le 630; $y += 60) { $graphics.DrawLine($gridPen, 0, $y, 1200, $y) }

$bridge = [System.Drawing.Image]::FromFile($bridgePath)
$fidic = [System.Drawing.Image]::FromFile($fidicPath)
$cardBack = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(225, 14, 15, 18))
$cardPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(78, 255, 255, 255)), 1

$graphics.FillRectangle($cardBack, 745, 55, 205, 520)
$graphics.FillRectangle($cardBack, 930, 90, 205, 485)
$graphics.DrawRectangle($cardPen, 745, 55, 205, 520)
$graphics.DrawRectangle($cardPen, 930, 90, 205, 485)
$graphics.DrawImage($bridge, 754, 64, 187, 502)
$graphics.DrawImage($fidic, 939, 99, 187, 467)

$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 247, 249))
$muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(160, 166, 172))
$accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(213, 219, 224))
$fontRegular = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$fontSmall = New-Object System.Drawing.Font "Consolas", 15, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$fontName = New-Object System.Drawing.Font "Segoe UI", 26, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$fontTitle = New-Object System.Drawing.Font "Segoe UI", 58, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)

$graphics.DrawString("RODION BELOUSOV / VIENNA", $fontSmall, $muted, 70, 68)
$graphics.DrawString("Digital Marketer", $fontTitle, $white, 65, 150)
$graphics.DrawString("Creative Developer", $fontTitle, $white, 65, 216)
$graphics.DrawString("Strategy / Content / Technical SEO / Astro / Three.js", $fontRegular, $accent, 70, 325)
$graphics.DrawString("Marketing systems with measurable search growth and spatial craft.", $fontRegular, $muted, 70, 375)
$graphics.DrawString("rodionbelousov.studio", $fontName, $white, 70, 515)

$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq "image/jpeg"
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 88L
$canvas.Save($output, $encoder, $encoderParams)

$fontRegular.Dispose()
$fontSmall.Dispose()
$fontName.Dispose()
$fontTitle.Dispose()
$white.Dispose()
$muted.Dispose()
$accent.Dispose()
$cardBack.Dispose()
$cardPen.Dispose()
$gridPen.Dispose()
$bridge.Dispose()
$fidic.Dispose()
$graphics.Dispose()
$canvas.Dispose()

Write-Output $output
