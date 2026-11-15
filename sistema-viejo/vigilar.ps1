<#
  VIGILAR - Fabrica de Casos
  Mira las carpetas Ideas y Proyectos cada 3 segundos. Si algo cambia, regenera Panel.html
  (panel.ps1 -NoAbrir) y el Panel abierto en el navegador se recarga solo.
  Lo arranca "Abrir Fabrica de Casos.bat" en segundo plano. Se cierra solo cuando
  Claude Code lleva 2 minutos cerrado. Todo local: no instala nada ni se conecta a internet.
  Uso manual:  powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File .\vigilar.ps1
#>
$ErrorActionPreference = 'Continue'
$Base = Split-Path -Parent $MyInvocation.MyCommand.Path

# una sola copia a la vez
$creado = $false
$mutex = New-Object Threading.Mutex($true, 'Global\FabricaCasosVigilar', [ref]$creado)
if(-not $creado){ exit }

function Firma {
  $sb = New-Object Text.StringBuilder
  foreach($d in 'Ideas','Proyectos'){
    $p = Join-Path $Base $d
    if(-not (Test-Path $p)){ continue }
    # recursos\ y exportar\ se excluyen: miles de imagenes o videos no cambian lo que muestra el Panel salvo el conteo
    Get-ChildItem $p -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch '\\(exportar|audio|voz)\\' } |
      ForEach-Object { [void]$sb.Append($_.FullName).Append('|').Append($_.Length).Append('|').Append($_.LastWriteTimeUtc.Ticks).Append(';') }
  }
  return $sb.ToString().GetHashCode()
}

$ultima = Firma
$sinClaude = 0
while($true){
  Start-Sleep -Seconds 3
  try {
    $f = Firma
    if($f -ne $ultima){
      Start-Sleep -Milliseconds 800   # deja terminar de escribir el archivo
      $f = Firma
      & (Join-Path $Base 'panel.ps1') -NoAbrir | Out-Null
      $ultima = $f
    }
  } catch { }
  if(Get-Process -Name 'claude' -ErrorAction SilentlyContinue){ $sinClaude = 0 } else { $sinClaude += 3 }
  if($sinClaude -ge 120){ break }
}
$mutex.ReleaseMutex()
