param(
    [int]$Port = 5500
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")

Add-Type -AssemblyName System.Web

function Get-OgMetaValue {
    param(
        [Parameter(Mandatory = $true)][string]$Html,
        [Parameter(Mandatory = $true)][string]$Property
    )

    $pattern = '<meta[^>]*property="' + [regex]::Escape($Property) + '"[^>]*content="([^"]+)"'
    $match = [regex]::Match($Html, $pattern, 'IgnoreCase')
    if ($match.Success) {
        return $match.Groups[1].Value
    }

    return $null
}

try {
    $listener.Start()
    Write-Output "Serving $root at http://localhost:$Port/"

    while ($listener.IsListening) {
        $context = $null

        try {
            $context = $listener.GetContext()
            $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))

            if ([string]::IsNullOrWhiteSpace($requestPath)) {
                $requestPath = 'index.html'
            }

            if ($requestPath -eq '.netlify/functions/spotify-track') {
                $query = [System.Web.HttpUtility]::ParseQueryString($context.Request.Url.Query)
                $spotifyUrl = $query.Get('url')

                if ([string]::IsNullOrWhiteSpace($spotifyUrl)) {
                    $context.Response.StatusCode = 400
                    $context.Response.ContentType = 'application/json; charset=utf-8'
                    $errorJson = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Missing url"}')
                    $context.Response.OutputStream.Write($errorJson, 0, $errorJson.Length)
                    continue
                }

                try {
                    $resp = Invoke-WebRequest -Uri $spotifyUrl -UseBasicParsing -Headers @{ 'User-Agent' = 'Mozilla/5.0' }
                    $html = $resp.Content

                    $title = (Get-OgMetaValue -Html $html -Property 'og:title')
                    $description = (Get-OgMetaValue -Html $html -Property 'og:description')
                    $previewUrl = (Get-OgMetaValue -Html $html -Property 'og:audio')

                    $artist = $null
                    if (-not [string]::IsNullOrWhiteSpace($description)) {
                        $artist = ($description -split ([char]0x00B7))[0].Trim()
                    }

                    if ([string]::IsNullOrWhiteSpace($title)) {
                        throw 'Could not extract track title'
                    }

                    $payload = @{
                        url = $spotifyUrl
                        title = $title
                        artist = $artist
                        previewUrl = $previewUrl
                    }

                    $json = $payload | ConvertTo-Json -Depth 6
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                    $context.Response.StatusCode = 200
                    $context.Response.ContentType = 'application/json; charset=utf-8'
                    $context.Response.ContentLength64 = $bytes.Length
                    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                catch {
                    $context.Response.StatusCode = 500
                    $context.Response.ContentType = 'application/json; charset=utf-8'
                    $message = $_.Exception.Message
                    if ([string]::IsNullOrWhiteSpace($message)) {
                        $message = 'Unexpected error'
                    }
                    $errorPayload = @{ error = $message }
                    $errorText = $errorPayload | ConvertTo-Json -Depth 4
                    $errorJson = [System.Text.Encoding]::UTF8.GetBytes($errorText)
                    $context.Response.OutputStream.Write($errorJson, 0, $errorJson.Length)
                }

                continue
            }

            $filePath = Join-Path $root $requestPath

            if ((Test-Path $filePath) -and -not (Get-Item $filePath).PSIsContainer) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
                $contentType = switch ($extension) {
                    '.html' { 'text/html; charset=utf-8' }
                    '.css' { 'text/css; charset=utf-8' }
                    '.js' { 'application/javascript; charset=utf-8' }
                    '.json' { 'application/json; charset=utf-8' }
                    '.jpg' { 'image/jpeg' }
                    '.jpeg' { 'image/jpeg' }
                    '.png' { 'image/png' }
                    '.svg' { 'image/svg+xml' }
                    '.ico' { 'image/x-icon' }
                    '.mp3' { 'audio/mpeg' }
                    '.ogg' { 'audio/ogg' }
                    default { 'application/octet-stream' }
                }

                $context.Response.ContentType = $contentType
                $context.Response.ContentLength64 = $bytes.Length
                $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            else {
                $context.Response.StatusCode = 404
                $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes('404')
                $context.Response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
            }
        }
        catch [System.Net.HttpListenerException] {
            Write-Warning "El cliente cerro la conexion antes de terminar la respuesta."
        }
        catch [System.Management.Automation.MethodInvocationException] {
            Write-Warning "La respuesta se interrumpio por una desconexion del cliente."
        }
        finally {
            if ($context -and $context.Response -and $context.Response.OutputStream) {
                try {
                    $context.Response.OutputStream.Close()
                }
                catch {
                }
            }
        }
    }
}
finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }

    $listener.Close()
}