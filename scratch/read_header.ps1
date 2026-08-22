Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = "c:\Users\jeova\.gemini\antigravity\brain\eleja\importados\consulta_cand_2026.zip"
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$entry = $zip.GetEntry("consulta_cand_2026_CE.csv")
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::GetEncoding("iso-8859-1"))
$header = $reader.ReadLine()
$sample = $reader.ReadLine()
$reader.Close()
$stream.Close()
$zip.Dispose()

Write-Host "HEADER:"
Write-Host $header
Write-Host "`nSAMPLE:"
Write-Host $sample
