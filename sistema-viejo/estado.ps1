<#
  ESTADO - Fabrica de Casos
  Avisa al Panel de Casos que hay tareas en curso, para que muestre una barra de progreso por tarea
  y el tiempo estimado. Escribe estado.js (lo lee el Panel cada 3 segundos) y guarda cuanto tardo
  cada tarea en estado_historial.csv para estimar mejor la proxima vez.

  Uso:
    .\estado.ps1 -Inicio -Tipo cazador -Tarea "Buscando casos nuevos" [-Minutos 25] [-Total 15] [-InicioHora "21:35"]
    .\estado.ps1 -Tipo cazador -Paso 4 [-Detalle "Caso 4 de 15"]      (avance; opcional)
    .\estado.ps1 -Tipo cazador -Fin [-Detalle "Lista lista"]
  Si se omite -Tipo en -Paso o -Fin, se usa la tarea activa mas reciente.
  Tipos sugeridos: cazador, analista, empaquetador, guionista, verificador, estilo, recursos
#>
param(
  [switch]$Inicio, [switch]$Fin,
  [string]$Tipo = '', [string]$Tarea = '', [double]$Minutos = 0,
  [int]$Paso = -1, [int]$Total = 0, [string]$Detalle = $null, [string]$InicioHora = ''
)
$ErrorActionPreference = 'Stop'
$Base = Split-Path -Parent $MyInvocation.MyCommand.Path
$Js   = Join-Path $Base 'estado.js'
$Hist = Join-Path $Base 'estado_historial.csv'
$Json = Join-Path $Base 'estado.json'
$utf8 = New-Object Text.UTF8Encoding($false)
function Ahora { [DateTimeOffset]::Now.ToUnixTimeMilliseconds() }

# minutos por defecto si todavia no hay historial (se corrigen solos con el uso)
$defecto = @{ cazador=25; analista=15; empaquetador=8; guionista=15; verificador=15; estilo=6; recursos=15 }

# ---- leer / guardar la lista de tareas ----
$lista = New-Object System.Collections.ArrayList
if(Test-Path $Json){
  $raw = Get-Content $Json -Raw -Encoding UTF8 | ConvertFrom-Json
  if($raw -ne $null){
    if($raw.PSObject.Properties.Name -contains 'tareas'){ foreach($t in @($raw.tareas)){ [void]$lista.Add($t) } }
    elseif($raw.PSObject.Properties.Name -contains 'tipo'){ [void]$lista.Add($raw) }   # formato viejo (una sola tarea)
  }
}
function Guardar {
  # se quedan las activas y las terminadas hace menos de 10 min
  $lim = (Ahora) - 600000
  $vivas = @($lista | Where-Object { $_.activo -or ([double]$_.fin -gt $lim) })
  $txt = (@{ tareas = $vivas } | ConvertTo-Json -Compress -Depth 5)
  [IO.File]::WriteAllText($Json, $txt, $utf8)
  [IO.File]::WriteAllText($Js, "window.PANEL_ESTADO=$txt;", $utf8)
}

if($Inicio){
  $t0 = Ahora
  if($InicioHora){ $t0 = [DateTimeOffset]::new([datetime]::Today.Add([timespan]::Parse($InicioHora))).ToUnixTimeMilliseconds() }
  $est = $Minutos; $fuente = 'indicado'
  if(Test-Path $Hist){
    $prev = @(Import-Csv $Hist | Where-Object { $_.tipo -eq $Tipo } | Select-Object -Last 3)
    if($prev.Count -gt 0){
      $est = ($prev | ForEach-Object { [double]$_.minutos } | Measure-Object -Average).Average
      $fuente = if($prev.Count -eq 1){ 'según la vez anterior' } else { "promedio de las últimas $($prev.Count) veces" }
    }
  }
  if($est -le 0){ $est = if($defecto.ContainsKey($Tipo)){ $defecto[$Tipo] } else { 10 }; $fuente = 'estimado inicial' }
  # si ya habia una del mismo tipo, se reemplaza
  foreach($v in @($lista | Where-Object { $_.tipo -eq $Tipo })){ $lista.Remove($v) }
  [void]$lista.Add([pscustomobject][ordered]@{ activo=$true; tipo=$Tipo; tarea=$Tarea; inicio=$t0; estimadoMin=[math]::Round($est,1); fuente=$fuente; paso=0; total=$Total; detalle=''; fin=0 })
  Guardar
  "Estado: '$Tarea' en curso, unos $([math]::Round($est)) min"
  exit
}

# elegir la tarea
$e = $null
if($Tipo){ $e = @($lista | Where-Object { $_.tipo -eq $Tipo }) | Select-Object -Last 1 }
else { $e = @($lista | Where-Object { $_.activo } | Sort-Object { [double]$_.inicio }) | Select-Object -Last 1 }
if(-not $e){ "No hay tarea en curso$(if($Tipo){" de tipo $Tipo"})."; exit }

if($Fin){
  $tFin = Ahora
  $min = [math]::Round(($tFin - [double]$e.inicio) / 60000, 1)
  $e.activo = $false; $e.fin = $tFin
  if($null -ne $Detalle){ $e.detalle = $Detalle }
  Guardar
  if($e.tipo -and $min -gt 0.5){
    $fila = [pscustomobject]@{ fecha=(Get-Date -Format 'yyyy-MM-dd HH:mm'); tipo=$e.tipo; minutos=$min; tarea=$e.tarea }
    if(Test-Path $Hist){ $fila | Export-Csv $Hist -Append -NoTypeInformation -Encoding UTF8 } else { $fila | Export-Csv $Hist -NoTypeInformation -Encoding UTF8 }
  }
  "Estado: '$($e.tarea)' terminado en $min min"
  exit
}

if($Paso -ge 0){ $e.paso = $Paso }
if($Total -gt 0){ $e.total = $Total }
if($null -ne $Detalle){ $e.detalle = $Detalle }
Guardar
"Estado '$($e.tipo)': paso $($e.paso) de $($e.total)"
