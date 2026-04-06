param(
    [int]$Port = 5500
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.IgnoreWriteExceptions = $true

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

function Get-ContentType {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath
    )

    $extension = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()

    switch ($extension) {
        '.html' { 'text/html; charset=utf-8' }
        '.css' { 'text/css; charset=utf-8' }
        '.js' { 'application/javascript; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.txt' { 'text/plain; charset=utf-8' }
        '.jpg' { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.png' { 'image/png' }
        '.gif' { 'image/gif' }
        '.svg' { 'image/svg+xml' }
        '.ico' { 'image/x-icon' }
        '.mp3' { 'audio/mpeg' }
        '.ogg' { 'audio/ogg' }
        '.mp4' { 'video/mp4' }
        '.webm' { 'video/webm' }
        '.woff2' { 'font/woff2' }
        '.woff' { 'font/woff' }
        '.ttf' { 'font/ttf' }
        default { 'application/octet-stream' }
    }
}

function Write-JsonResponse {
    param(
        [Parameter(Mandatory = $true)][System.Net.HttpListenerResponse]$Response,
        [Parameter(Mandatory = $true)][int]$StatusCode,
        [Parameter(Mandatory = $true)][string]$Json
    )

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Json)
    $Response.StatusCode = $StatusCode
    $Response.ContentType = 'application/json; charset=utf-8'
    $Response.ContentLength64 = $bytes.Length
    $Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Write-TextResponse {
    param(
        [Parameter(Mandatory = $true)][System.Net.HttpListenerResponse]$Response,
        [Parameter(Mandatory = $true)][int]$StatusCode,
        [Parameter(Mandatory = $true)][string]$Text
    )

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $Response.StatusCode = $StatusCode
    $Response.ContentType = 'text/plain; charset=utf-8'
    $Response.ContentLength64 = $bytes.Length
    $Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Send-FileResponse {
    param(
        [Parameter(Mandatory = $true)][System.Net.HttpListenerContext]$Context,
        [Parameter(Mandatory = $true)][string]$FilePath
    )

    $response = $Context.Response
    $request = $Context.Request

    $fileInfo = [System.IO.FileInfo]::new($FilePath)
    $totalLength = [int64]$fileInfo.Length

    $response.ContentType = Get-ContentType -FilePath $FilePath
    $response.Headers['Accept-Ranges'] = 'bytes'

    $rangeHeader = $request.Headers['Range']
    $isHeadRequest = ($request.HttpMethod -eq 'HEAD')

    if ($rangeHeader -and ($rangeHeader -match '^bytes=(\d*)-(\d*)$')) {
        $startText = $matches[1]
        $endText = $matches[2]

        $start = if ($startText) { [int64]$startText } else { 0 }
        $end = if ($endText) { [int64]$endText } else { $totalLength - 1 }

        if ($start -lt 0 -or $start -ge $totalLength -or $end -lt $start) {
            $response.StatusCode = 416
            $response.Headers['Content-Range'] = "bytes */$totalLength"
            $response.ContentLength64 = 0
            return
        }

        if ($end -ge $totalLength) {
            $end = $totalLength - 1
        }

        $length = ($end - $start) + 1
        $response.StatusCode = 206
        $response.ContentLength64 = $length
        $response.Headers['Content-Range'] = "bytes $start-$end/$totalLength"

        if ($isHeadRequest) {
            return
        }

        $stream = [System.IO.FileStream]::new(
            $FilePath,
            [System.IO.FileMode]::Open,
            [System.IO.FileAccess]::Read,
            [System.IO.FileShare]::ReadWrite
        )

        try {
            $null = $stream.Seek($start, [System.IO.SeekOrigin]::Begin)
            $buffer = New-Object byte[] 65536
            $remaining = [int64]$length

            while ($remaining -gt 0) {
                $toRead = [int][System.Math]::Min($buffer.Length, $remaining)
                $read = $stream.Read($buffer, 0, $toRead)

                if ($read -le 0) {
                    break
                }

                $response.OutputStream.Write($buffer, 0, $read)
                $remaining -= $read
            }
        }
        finally {
            $stream.Close()
        }

        return
    }

    $response.StatusCode = 200
    $response.ContentLength64 = $totalLength

    if ($isHeadRequest) {
        return
    }

    $stream = [System.IO.FileStream]::new(
        $FilePath,
        [System.IO.FileMode]::Open,
        [System.IO.FileAccess]::Read,
        [System.IO.FileShare]::ReadWrite
    )

    try {
        $stream.CopyTo($response.OutputStream)
    }
    finally {
        $stream.Close()
    }
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
                    Write-JsonResponse -Response $context.Response -StatusCode 400 -Json '{"error":"Missing url"}'
                    continue
                }

                try {
                    $resp = Invoke-WebRequest -Uri $spotifyUrl -UseBasicParsing -TimeoutSec 10 -Headers @{ 'User-Agent' = 'Mozilla/5.0' }
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
                    Write-JsonResponse -Response $context.Response -StatusCode 200 -Json $json
                }
                catch {
                    $message = $_.Exception.Message
                    if ([string]::IsNullOrWhiteSpace($message)) {
                        $message = 'Unexpected error'
                    }
                    $errorPayload = @{ error = $message }
                    $errorText = $errorPayload | ConvertTo-Json -Depth 4
                    Write-JsonResponse -Response $context.Response -StatusCode 500 -Json $errorText
                }

                continue
            }

            $filePath = Join-Path $root $requestPath

            if ((Test-Path $filePath) -and -not (Get-Item $filePath).PSIsContainer) {
                Send-FileResponse -Context $context -FilePath $filePath
            }
            else {
                Write-TextResponse -Response $context.Response -StatusCode 404 -Text '404'
            }
        }
        catch [System.Net.HttpListenerException] {
            Write-Warning "El cliente cerro la conexion antes de terminar la respuesta."
        }
        catch [System.Management.Automation.MethodInvocationException] {
            Write-Warning "La respuesta se interrumpio por una desconexion del cliente."
        }
        catch {
            Write-Warning ("Error inesperado sirviendo la solicitud: " + ($_.Exception.Message | Out-String))

            try {
                if ($context -and $context.Response) {
                    Write-TextResponse -Response $context.Response -StatusCode 500 -Text '500'
                }
            }
            catch {
            }
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
