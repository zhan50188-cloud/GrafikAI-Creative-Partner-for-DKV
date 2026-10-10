# serve.ps1 — server statis sederhana untuk GrafikAI (tanpa Node/Python).
# Jalankan:  powershell -ExecutionPolicy Bypass -File serve.ps1
# lalu buka: http://localhost:8080

param(
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".mjs"  = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".webp" = "image/webp"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".txt"  = "text/plain; charset=utf-8"
    ".md"   = "text/markdown; charset=utf-8"
}

$prefix = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Gagal memulai server di port $Port." -ForegroundColor Red
    Write-Host "Mungkin port sudah dipakai. Coba port lain, contoh:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 5500" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "  GrafikAI aktif di: $prefix" -ForegroundColor Green
Write-Host "  Folder          : $root"
Write-Host "  Tekan Ctrl+C untuk berhenti."
Write-Host ""

# Buka browser otomatis
try { Start-Process $prefix } catch {}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
    } catch {
        break
    }
    $request = $context.Request
    $response = $context.Response

    try {
        $relPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($relPath)) { $relPath = "index.html" }

        # Cegah path traversal keluar dari root
        $fullPath = Join-Path $root $relPath
        $fullResolved = [System.IO.Path]::GetFullPath($fullPath)
        $rootResolved = [System.IO.Path]::GetFullPath($root)

        if (-not $fullResolved.StartsWith($rootResolved, [System.StringComparison]::OrdinalIgnoreCase)) {
            $response.StatusCode = 403
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # Jika folder, pakai index.html di dalamnya
        if (Test-Path $fullResolved -PathType Container) {
            $fullResolved = Join-Path $fullResolved "index.html"
        }

        if (Test-Path $fullResolved -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($fullResolved).ToLower()
            $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
            $content = [System.IO.File]::ReadAllBytes($fullResolved)
            $response.StatusCode = 200
            $response.ContentType = $contentType
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
            Write-Host ("  200  /{0}" -f $relPath) -ForegroundColor DarkGray
        } else {
            $response.StatusCode = 404
            $msg = "404 Not Found: /$relPath"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
            $response.ContentType = "text/plain; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host ("  404  /{0}" -f $relPath) -ForegroundColor Yellow
        }
    } catch {
        try {
            $response.StatusCode = 500
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("500 Internal Server Error")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } catch {}
        Write-Host ("  500  " + $_.Exception.Message) -ForegroundColor Red
    } finally {
        try { $response.Close() } catch {}
    }
}

$listener.Stop()
