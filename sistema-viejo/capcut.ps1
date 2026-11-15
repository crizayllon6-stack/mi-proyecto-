<#
  CAPCUT - Fabrica de Casos
  Crea un proyecto NUEVO de CapCut (PC) con los clips de un video ya armados en la linea de tiempo,
  uno por imagen, en orden y con sus tiempos. Usa la lista que deja edicion.ps1 (exportar\segmentos.json).
  Si existe voz en voz\ (un solo archivo), tambien la pone en una pista de audio.

  - No modifica tus proyectos existentes: solo agrega uno nuevo y anota su nombre en la lista de CapCut
    (root_meta_info.json), del que antes guarda un respaldo con fecha.
  - CapCut debe estar CERRADO al correrlo (si esta abierto, el script se detiene).
  - Experimental: si CapCut no lo abre bien, borra el proyecto desde CapCut o corre con -Borrar.

  Uso:
    .\edicion.ps1 -Proyecto "grenfell_revestimiento"      (primero: genera los clips)
    .\capcut.ps1  -Proyecto "grenfell_revestimiento" [-Nombre "Grenfell v1"]
    .\capcut.ps1  -Proyecto "grenfell_revestimiento" -Nombre "Grenfell v1" -Borrar
#>
param(
  [Parameter(Mandatory=$true)][string]$Proyecto,
  [string]$Nombre = '',
  [switch]$Borrar
)
$ErrorActionPreference = 'Stop'
# PowerShell 5.1 a veces escribe los arreglos como {"value":[...],"Count":n}; esto lo evita
Remove-TypeData System.Array -ErrorAction SilentlyContinue
$Base = Split-Path -Parent $MyInvocation.MyCommand.Path
$Pl   = Join-Path $Base 'plantilla_capcut'
$Root = Join-Path $env:LOCALAPPDATA 'CapCut\User Data\Projects\com.lveditor.draft'
$RootMeta = Join-Path $Root 'root_meta_info.json'
$Exp  = Join-Path $Base ("Proyectos\" + $Proyecto + "\exportar")
$utf8 = New-Object Text.UTF8Encoding($false)
if(-not $Nombre){ $Nombre = $Proyecto }
$Nombre = ($Nombre -replace '[\\/:*?"<>|]', '').Trim()
$Dest = Join-Path $Root $Nombre

if(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match '^CapCut' }){ throw 'CapCut esta abierto. Cierralo y vuelve a correr este script.' }
if(-not (Test-Path $RootMeta)){ throw "No encuentro la carpeta de proyectos de CapCut: $Root" }

function Guid { [guid]::NewGuid().ToString().ToUpper() }
function Hex32 { ([guid]::NewGuid().ToString('N')) }
function Clon($o){ return ($o | ConvertTo-Json -Depth 60 -Compress | ConvertFrom-Json) }
function Us([double]$s){ return [long][Math]::Round($s * 1000000) }
function AhoraUs { return [long]([DateTimeOffset]::Now.ToUnixTimeMilliseconds() * 1000) }
function Escribir([string]$p, $obj){ [IO.File]::WriteAllText($p, ($obj | ConvertTo-Json -Depth 60 -Compress), $utf8) }
function Ruta([string]$p){ return ($p -replace '\\','/') }

# respaldo de la lista de proyectos de CapCut
$bkDir = Join-Path $Base 'plantilla_capcut\respaldos'
New-Item -ItemType Directory -Force $bkDir | Out-Null
Copy-Item $RootMeta (Join-Path $bkDir ("root_meta_info_" + (Get-Date -Format 'yyyyMMdd_HHmmss') + ".json"))
$rootObj = Get-Content $RootMeta -Raw -Encoding UTF8 | ConvertFrom-Json

# ---- borrar un proyecto creado por este script ----
if($Borrar){
  $keep = @($rootObj.all_draft_store | Where-Object { $_.draft_name -ne $Nombre })
  $rootObj.all_draft_store = $keep; $rootObj.draft_ids = $keep.Count
  Escribir $RootMeta $rootObj
  if(Test-Path (Join-Path $Dest '.fabrica_casos')){ Remove-Item -LiteralPath $Dest -Recurse -Force; "Borrado: $Nombre" }
  else { "Quitado de la lista. La carpeta no era de la Fabrica, no la borre: $Dest" }
  exit
}

if(Test-Path $Dest){ throw "Ya existe un proyecto de CapCut llamado '$Nombre'. Usa otro -Nombre o borralo con -Borrar." }
$segInfo = Join-Path $Exp 'segmentos.json'
if(-not (Test-Path $segInfo)){ throw "Falta $segInfo. Corre primero: .\edicion.ps1 -Proyecto `"$Proyecto`"" }
$info = Get-Content $segInfo -Raw -Encoding UTF8 | ConvertFrom-Json

$ffprobe = (Get-ChildItem (Join-Path $Base 'herramientas') -Recurse -Filter ffprobe.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
function DurReal([string]$f){
  if(-not $ffprobe){ return $null }
  $o = & $ffprobe -v error -show_entries format=duration -of csv=p=0 $f
  return [double]::Parse(($o | Select-Object -First 1).Trim(), [Globalization.CultureInfo]::InvariantCulture)
}

# ---- plantillas ----
$tc   = Get-Content (Join-Path $Pl 'draft_content.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$tm   = Get-Content (Join-Path $Pl 'draft_meta_info.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$tvs  = Get-Content (Join-Path $Pl 'draft_virtual_store.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$tre  = Get-Content (Join-Path $Pl 'root_entry.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$segT = $tc.tracks[0].segments[0]
$vidT = $tc.materials.videos[0]
$metaT = ($tm.draft_materials | Where-Object { $_.type -eq 0 }).value | Where-Object { $_.metetype -eq 'video' } | Select-Object -First 1
$extraT = @{
  speeds = $tc.materials.speeds[0]; placeholder_infos = $tc.materials.placeholder_infos[0]; canvases = $tc.materials.canvases[0]
  sound_channel_mappings = $tc.materials.sound_channel_mappings[0]; material_colors = $tc.materials.material_colors[0]; vocal_separations = $tc.materials.vocal_separations[0]
}

$c = Clon $tc
$c.id = Guid
$c.canvas_config.ratio = '16:9'; $c.canvas_config.width = [int]$info.ancho; $c.canvas_config.height = [int]$info.alto
$c.fps = [double]$info.fps
foreach($k in $extraT.Keys){ $c.materials.$k = @() }
$c.materials.videos = @()
$track = Clon $tc.tracks[0]; $track.id = Guid; $track.segments = @()

$metaList = @(); $vsChildren = @()
$t = [long]0; $ahora = AhoraUs; $nowS = [long]($ahora / 1000000)
$listaVideos = New-Object Collections.Generic.List[object]
$listaSegs = New-Object Collections.Generic.List[object]
$listaExtra = @{}; foreach($k in $extraT.Keys){ $listaExtra[$k] = New-Object Collections.Generic.List[object] }

foreach($s in $info.segmentos){
  $f = [string]$s.archivo
  if(-not (Test-Path $f)){ continue }
  $dr = DurReal $f; if(-not $dr){ $dr = [double]$s.dur }
  $d = Us $dr
  $localId = [guid]::NewGuid().ToString()
  $v = Clon $vidT
  $v.id = Guid; $v.unique_id = Hex32; $v.duration = $d; $v.path = (Ruta $f); $v.width = [int]$info.ancho; $v.height = [int]$info.alto
  $v.material_name = [IO.Path]::GetFileName($f); $v.local_material_id = $localId; $v.has_audio = $false
  $listaVideos.Add($v)
  $refs = @()
  foreach($k in @('speeds','placeholder_infos','canvases','sound_channel_mappings','material_colors','vocal_separations')){
    $x = Clon $extraT[$k]; $x.id = Guid; $listaExtra[$k].Add($x); $refs += $x.id
  }
  $g = Clon $segT
  $g.id = Guid; $g.material_id = $v.id; $g.extra_material_refs = $refs
  $g.source_timerange.start = 0; $g.source_timerange.duration = $d
  $g.target_timerange.start = $t; $g.target_timerange.duration = $d
  $g.desc = [string]$s.titulo
  $listaSegs.Add($g)
  $m = Clon $metaT
  $m.id = $localId; $m.file_Path = (Ruta $f); $m.extra_info = [IO.Path]::GetFileName($f); $m.duration = $d
  $m.width = [int]$info.ancho; $m.height = [int]$info.alto; $m.create_time = $nowS; $m.import_time = $nowS; $m.import_time_ms = $ahora
  $m.roughcut_time_range.duration = $d
  $metaList += $m
  $vsChildren += [pscustomobject]@{ child_id = $localId; parent_id = '' }
  $t += $d
}
if($listaSegs.Count -eq 0){ throw 'No hay clips en exportar\segmentos. Corre edicion.ps1 otra vez.' }
$track.segments = $listaSegs.ToArray()
$c.materials.videos = $listaVideos.ToArray()
foreach($k in $extraT.Keys){ $c.materials.$k = $listaExtra[$k].ToArray() }
$c.tracks = @($track)
$c.duration = $t
$total = $t

# ---- carpeta del proyecto ----
New-Item -ItemType Directory -Force $Dest | Out-Null
Set-Content (Join-Path $Dest '.fabrica_casos') "Creado por capcut.ps1 de la Fabrica de Casos ($Proyecto)" -Encoding ASCII
Escribir (Join-Path $Dest 'draft_content.json') $c
Copy-Item (Join-Path $Pl 'draft_agency_config.json') $Dest
$tl = Get-Content (Join-Path $Pl 'timeline_layout.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$tl.dockItems[0].timelineIds = @($c.id)
Escribir (Join-Path $Dest 'timeline_layout.json') $tl
$sec = [long]($ahora / 1000000)
[IO.File]::WriteAllText((Join-Path $Dest 'draft_settings'), "[General]`r`ndraft_create_time=$sec`r`ndraft_last_edit_time=$sec`r`nreal_edit_seconds=0`r`nreal_edit_keys=0`r`n", $utf8)
$vs = Clon $tvs
($vs.draft_virtual_store | Where-Object { $_.type -eq 1 }).value = $vsChildren
Escribir (Join-Path $Dest 'draft_virtual_store.json') $vs

$draftId = Guid
$destFwd = Ruta $Dest
$m = Clon $tm
$m.draft_id = $draftId; $m.draft_name = $Nombre; $m.draft_fold_path = $destFwd; $m.draft_cover = 'draft_cover.jpg'
$m.tm_draft_create = $ahora; $m.tm_draft_modified = $ahora; $m.tm_duration = $total
foreach($grp in $m.draft_materials){ if($grp.type -eq 0){ $grp.value = $metaList } else { $grp.value = @() } }
Escribir (Join-Path $Dest 'draft_meta_info.json') $m

# portada: primer cuadro del primer clip
$ffmpeg = (Get-ChildItem (Join-Path $Base 'herramientas') -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
if($ffmpeg){ & $ffmpeg -hide_banner -loglevel error -y -ss 1 -i ([string]$info.segmentos[0].archivo) -frames:v 1 -vf scale=480:-2 (Join-Path $Dest 'draft_cover.jpg') }

# ---- anotar en la lista de CapCut ----
$e = Clon $tre
$e.draft_id = $draftId; $e.draft_name = $Nombre; $e.draft_fold_path = $destFwd
$e.draft_cover = "$destFwd\draft_cover.jpg"; $e.draft_json_file = "$destFwd\draft_content.json"
$e.draft_root_path = $Root; $e.tm_draft_create = $ahora; $e.tm_draft_modified = $ahora; $e.tm_duration = $total
$e.draft_timeline_materials_size = 0
$lst = @($e) + @($rootObj.all_draft_store)
$rootObj.all_draft_store = $lst; $rootObj.draft_ids = $lst.Count
Escribir $RootMeta $rootObj

$min = [TimeSpan]::FromMilliseconds($total/1000)
"Proyecto de CapCut creado: '$Nombre' ($($listaSegs.Count) clips, {0}:{1:00})" -f [int][Math]::Floor($min.TotalMinutes), $min.Seconds
"Carpeta: $Dest"
"Subtitulos para importar en CapCut: $($info.subtitulos)"
