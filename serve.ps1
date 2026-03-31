param(
    [int]$Port = 5500
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")

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