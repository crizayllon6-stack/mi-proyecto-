<#
  FABRICA ICEBERG - herramienta de produccion para tu canal.
  Todo corre en tu PC. Solo se conecta a internet para buscar y bajar recursos libres de Wikimedia Commons.

  Uso (desde PowerShell):
    .\fabrica.ps1 -Accion Preparar -Proyecto "Nivel 2"
    .\fabrica.ps1 -Accion Revisar  -Proyecto "Nivel 2"
    .\fabrica.ps1 -Accion Buscar   -Proyecto "Nivel 2"
    .\fabrica.ps1 -Accion Papeleo  -Proyecto "Nivel 2"
#>
param(
  [Parameter(Mandatory=$true)][ValidateSet('Preparar','Revisar','Buscar','Papeleo')][string]$Accion,
  [Parameter(Mandatory=$true)][string]$Proyecto,
  [int]$PorBusqueda = 3,       # imagenes maximas por cada busqueda
  [int]$MaxVideoMB = 250,      # no baja videos mas pesados que esto
  [string]$Contacto = '',      # opcional: un correo de contacto; Wikimedia da mejor trato a quien se identifica
  [switch]$SinVideos
)
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'
$Base = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dir  = Join-Path $Base ("Proyectos\" + $Proyecto)
$UA   = 'FabricaIceberg/1.0 (proyecto personal de video)'
$cfgContacto = Join-Path $Base 'contacto.txt'   # correo de contacto autorizado por el usuario; se envia solo a Wikimedia. Borra el archivo para no enviarlo.
if(-not $Contacto -and (Test-Path $cfgContacto)){ $Contacto = (Get-Content $cfgContacto -Raw).Trim() }
if($Contacto){ $UA = 'FabricaIceberg/1.0 (proyecto personal de video; ' + $Contacto + ')' }
$EscenasPath = Join-Path $Dir 'escenas.json'
$CreditosPath = Join-Path $Dir 'creditos.csv'

# ---------------- utilidades ----------------
function Fold([string]$s){
  if([string]::IsNullOrEmpty($s)){ return '' }
  $n = $s.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object Text.StringBuilder
  foreach($c in $n.ToCharArray()){ if([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne 'NonSpacingMark'){ [void]$sb.Append($c) } }
  return $sb.ToString().ToLower()
}
function Slug([string]$s){
  $t = (Fold $s) -replace '^file:','' -replace '\.[a-z0-9]{2,4}$','' -replace '[^a-z0-9]+','_'
  $t = $t.Trim('_'); if($t.Length -gt 48){ $t = $t.Substring(0,48).Trim('_') }
  if(-not $t){ $t = 'recurso' }
  return $t
}
function Strip([string]$h){ if(-not $h){return ''}; return ([Net.WebUtility]::HtmlDecode(($h -replace '<[^>]+>',' ')) -replace '\s+',' ').Trim() }
function Tiene([string]$texto,[string]$f){
  # palabra completa (no dentro de otra palabra: "lion" no debe salir en "million")
  return [regex]::IsMatch($texto, '(?<![a-z0-9])' + [regex]::Escape($f) + '(?![a-z0-9])')
}
function Reintentar([scriptblock]$accion){
  # Wikimedia responde 429 si vamos muy rapido: esperamos y reintentamos
  for($i=1; $i -le 4; $i++){
    try{ return (& $accion) }
    catch{
      $msg = $_.Exception.Message
      if($msg -match '429|Too many' -and $i -lt 4){ $w = 25*$i; Write-Host "   ...Wikimedia pide calma, espero $w s"; Start-Sleep -Seconds $w } else { throw }
    }
  }
}
function Api($p){
  $q = ($p.GetEnumerator() | ForEach-Object { $_.Key + '=' + [uri]::EscapeDataString([string]$_.Value) }) -join '&'
  $u = "https://commons.wikimedia.org/w/api.php?format=json&" + $q
  return (Reintentar { Invoke-RestMethod $u -UserAgent $UA })
}
function LeerEscenas(){
  if(-not (Test-Path $EscenasPath)){ throw "No existe $EscenasPath. Corre primero -Accion Preparar." }
  return (Get-Content $EscenasPath -Raw -Encoding UTF8 | ConvertFrom-Json)
}
function Tiempo([double]$seg,[switch]$srt){
  $ts=[TimeSpan]::FromSeconds($seg)
  if($srt){ return ('{0:00}:{1:00}:{2:00},{3:000}' -f [int][Math]::Floor($ts.TotalHours),$ts.Minutes,$ts.Seconds,$ts.Milliseconds) }
  return ('{0}:{1:00}' -f [int][Math]::Floor($ts.TotalMinutes),$ts.Seconds)
}
function Palabras([string]$t){ return @(($t -split '\s+') | Where-Object { $_ -match '\w' }).Count }

# ---------------- PREPARAR ----------------
if($Accion -eq 'Preparar'){
  New-Item -ItemType Directory -Force -Path $Dir | Out-Null
  foreach($s in 'recursos','audio','voz','miniatura','exportar'){ New-Item -ItemType Directory -Force -Path (Join-Path $Dir $s) | Out-Null }
  $g = Join-Path $Dir 'guion.txt'
  if(-not (Test-Path $g)){ Set-Content $g "Pega aqui tu guion completo." -Encoding UTF8 }
  if(-not (Test-Path $EscenasPath)){
    $plantilla = [ordered]@{
      titulo_video = $Proyecto
      palabras_por_minuto = 150
      descripcion_inicio = 'Escribe aqui el parrafo de la descripcion.'
      escenas = @([ordered]@{
        id='01_Escena'; titulo='Nombre de la escena'; capitulo=$true
        texto='Texto de la narracion de esta escena.'
        busquedas=@([ordered]@{ q='nombre en ingles o con el que aparece en Wikipedia'; debe=@('palabra clave obligatoria') })
        excluir=@('palabra que NO debe aparecer')
        sin_videos=$false
      })
    }
    ($plantilla | ConvertTo-Json -Depth 8) | Set-Content $EscenasPath -Encoding UTF8
  }
  "Proyecto listo: $Dir"
  exit
}

# ---------------- REVISAR GUION ----------------
if($Accion -eq 'Revisar'){
  $g = Join-Path $Dir 'guion.txt'
  if(-not (Test-Path $g)){ throw "No existe $g" }
  $txt = Get-Content $g -Raw -Encoding UTF8
  $out = New-Object Collections.Generic.List[string]
  $out.Add("REVISION DEL GUION - $Proyecto"); $out.Add("")
  $palabras = Palabras $txt
  $out.Add("Palabras: $palabras  |  Duracion estimada a 150 ppm: " + (Tiempo ($palabras/150*60)))
  $out.Add("")
  $out.Add("1) SEÑALES DE TEXTO DE IA")
  $dash = [regex]::Matches($txt,'[—–]').Count
  $ell  = [regex]::Matches($txt,'\.\.\.|…').Count
  $out.Add("   Guiones largos (— o –): $dash   (ideal: 0)")
  $out.Add("   Puntos suspensivos: $ell   (ideal: pocos)")
  $frases = 'en conclusion','sin lugar a dudas','es importante destacar','cabe destacar','en un mundo','a continuacion','no es solo','en definitiva','un testimonio de','es un recordatorio','sumergirse','en el corazon de','tapiz','sin embargo, es crucial'
  $foldTxt = Fold $txt
  foreach($f in $frases){ $c=([regex]::Matches($foldTxt,[regex]::Escape($f))).Count; if($c -gt 0){ $out.Add("   Frase tipica de IA: '$f' x$c") } }
  $out.Add("")
  $out.Add("2) FRASES MUY LARGAS (mas de 38 palabras)")
  $sents = [regex]::Split($txt,'(?<=[\.\?\!])\s+|\r?\n')
  $hay=$false
  foreach($s in $sents){ if((Palabras $s) -gt 38){ $hay=$true; $out.Add("   [" + (Palabras $s) + "] " + $s.Substring(0,[Math]::Min(110,$s.Length)) + "...") } }
  if(-not $hay){ $out.Add("   Ninguna.") }
  $out.Add("")
  $out.Add("3) DATOS A VERIFICAR (frases con fechas, cifras o nombres de cargos)")
  foreach($s in $sents){ if($s -match '\b(1[89]\d\d|20\d\d)\b|\d[\d\.,]*\s*(dolares|kilos|kilometros|firmas|horas|crias|millones|%)|segun|aseguran|dijo que|revelo'){ $out.Add("   - " + $s.Trim()) } }
  $o = Join-Path $Dir 'revision_guion.txt'
  $out | Set-Content $o -Encoding UTF8
  "Listo: $o"
  exit
}

# ---------------- BUSCAR RECURSOS ----------------
function Buscar-Commons([string]$q,[string]$tipo){
  $ft = 'bitmap'; if($tipo -eq 'video'){ $ft = 'video' }
  $r = Api @{ action='query'; generator='search'; gsrnamespace='6'; gsrlimit='25'; gsrsearch=("filetype:$ft " + $q);
              prop='imageinfo|categories'; iiprop='url|size|mime|extmetadata'; iiurlwidth='1920'; cllimit='30' }
  if(-not $r.query){ return @() }
  return @($r.query.pages.PSObject.Properties.Value | Sort-Object { [int]$_.index })
}
function Evaluar($p,$b,$esc,$tipo){
  $ii = $p.imageinfo[0]; if(-not $ii){ return $null }
  $m  = $ii.extmetadata
  $lic = ''; if($m.LicenseShortName){ $lic = [string]$m.LicenseShortName.value }
  if($lic -notmatch '(?i)public domain|^cc0|^cc by|no restrictions|^pd|attribution'){ return $null }
  if($tipo -eq 'image' -and [int]$ii.width -lt 1000){ return $null }
  if($tipo -eq 'video' -and [int]$ii.width -lt 640){ return $null }
  $desc = ''; if($m.ImageDescription){ $desc = Strip $m.ImageDescription.value }
  $cats = ''; if($p.categories){ $cats = ($p.categories | ForEach-Object { $_.title }) -join ' ' }
  $titulo = [string]$p.title
  $blob = Fold ($titulo + ' ' + $desc + ' ' + $cats)
  $tit  = Fold $titulo
  foreach($x in @($esc.excluir)){ if($x -and (Tiene $blob (Fold $x))){ return $null } }
  $debe = @($b.debe); if(-not $debe -or -not $debe[0]){ $debe = @($b.q -split '\s+') }
  # TODAS las palabras de 'debe' tienen que aparecer. Dentro de una palabra se pueden dar alternativas con | (ej: "lion|leon")
  $coincide = New-Object Collections.Generic.List[string]; $score = 0
  foreach($d in $debe){
    if(-not $d){ continue }
    $hit = $false
    foreach($alt in ([string]$d -split '\|')){ $f = Fold $alt.Trim(); if(-not $f){continue}
      if(Tiene $tit $f){ $hit = $true; $score += 5; break }
      elseif($tipo -ne 'video' -and (Tiene $blob $f)){ $hit = $true; $score += 2; break }   # en videos solo cuenta el titulo
    }
    if(-not $hit){ return $null }
    $coincide.Add([string]$d)
  }
  if($coincide.Count -eq 0){ return $null }
  $dur = 0; if($m.Duration){ $dur = [double]$m.Duration.value }
  $au = ''; if($m.Artist){ $au = Strip $m.Artist.value }; if($au.Length -gt 120){ $au = $au.Substring(0,120) }
  return [pscustomobject]@{ Titulo=$titulo; Url=[string]$ii.url; Thumb=[string]$ii.thumburl; W=[int]$ii.width; H=[int]$ii.height
    Bytes=[long]$ii.size; Autor=$au; Licencia=$lic; Score=$score; Coincide=($coincide -join ', '); Duracion=$dur }
}

if($Accion -eq 'Buscar'){
  $cfg = LeerEscenas
  $rows = New-Object Collections.Generic.List[object]
  if(Test-Path $CreditosPath){ foreach($r in (Import-Csv $CreditosPath -Encoding UTF8)){ $rows.Add($r) } }
  $vistos = @{}; foreach($r in $rows){ $vistos[$r.Titulo] = $true }
  foreach($e in $cfg.escenas){
    $carp = Join-Path $Dir ("recursos\" + $e.id); New-Item -ItemType Directory -Force -Path $carp | Out-Null
    "== Escena $($e.id)"
    foreach($b in $e.busquedas){
      foreach($tipo in 'image','video'){
        if($tipo -eq 'video' -and ($SinVideos -or $e.sin_videos)){ continue }
        try{ $res = Buscar-Commons $b.q $tipo }catch{ "   ERROR buscando '$($b.q)': $($_.Exception.Message)"; continue }
        $cand = @($res | ForEach-Object { Evaluar $_ $b $e $tipo } | Where-Object { $_ -and -not $vistos[$_.Titulo] } | Sort-Object Score -Descending)
        $max = $PorBusqueda; if($tipo -eq 'video'){ $max = 1 }
        $n = 0
        foreach($c in $cand){
          if($n -ge $max){ break }
          if($tipo -eq 'video' -and ($c.Bytes/1MB) -gt $MaxVideoMB){ continue }
          $url = $c.Url; if($tipo -eq 'image' -and $c.W -gt 1920 -and $c.Thumb){ $url = $c.Thumb }
          $ext = [IO.Path]::GetExtension(($url -split '\?')[0]); if(-not $ext){ $ext = '.jpg' }
          $pref = ''; if($tipo -eq 'video'){ $pref = 'VIDEO_' }
          $nombre = $pref + (Slug $c.Titulo) + $ext
          $dest = Join-Path $carp $nombre
          try{
            [void](Reintentar { Invoke-WebRequest $url -OutFile $dest -UserAgent $UA })
            $rows.Add([pscustomobject]@{ Carpeta=$e.id; Archivo=$nombre; Titulo=$c.Titulo; Autor=$c.Autor; Licencia=$c.Licencia;
              Fuente=("https://commons.wikimedia.org/wiki/" + ($c.Titulo -replace ' ','_')); Coincide=$c.Coincide })
            $vistos[$c.Titulo] = $true; $n++
            "   OK  $nombre  [$($c.Coincide)]"
          }catch{ "   ERROR bajando $($c.Titulo): $($_.Exception.Message)" }
          Start-Sleep -Seconds 6
        }
        if($n -eq 0){ "   (sin resultados utiles: '$($b.q)' / $tipo)" }
        Start-Sleep -Seconds 1
      }
    }
  }
  $rows | Export-Csv $CreditosPath -NoTypeInformation -Encoding UTF8

  # pagina de revision visual
  $h = New-Object Text.StringBuilder
  [void]$h.Append('<!doctype html><meta charset="utf-8"><title>Revision de recursos</title><style>body{font-family:Segoe UI,sans-serif;background:#12101f;color:#eee;margin:20px}h2{color:#22d3ee;margin-top:30px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.c{background:#1c1930;border-radius:10px;padding:8px;font-size:12px}.c img,.c video{width:100%;border-radius:6px}a{color:#8b5cf6}</style>')
  [void]$h.Append("<h1>Revision de recursos - $Proyecto</h1><p>Borra de la carpeta los que NO sean del caso. Lo que quede se usa en el storyboard y los creditos.</p>")
  foreach($e in $cfg.escenas){
    [void]$h.Append("<h2>$($e.id) - $($e.titulo)</h2><div class='g'>")
    foreach($r in ($rows | Where-Object { $_.Carpeta -eq $e.id })){
      $rel = "recursos/$($e.id)/$($r.Archivo)"
      if($r.Archivo -like 'VIDEO_*'){ $m = "<video src='$rel' controls preload='metadata'></video>" } else { $m = "<img src='$rel' loading='lazy'>" }
      [void]$h.Append("<div class='c'>$m<br><b>$([Net.WebUtility]::HtmlEncode($r.Archivo))</b><br>Coincide: $($r.Coincide)<br>$($r.Licencia) - $([Net.WebUtility]::HtmlEncode($r.Autor))<br><a href='$($r.Fuente)'>fuente</a></div>")
    }
    [void]$h.Append('</div>')
  }
  [IO.File]::WriteAllText((Join-Path $Dir 'revision.html'), $h.ToString(), (New-Object Text.UTF8Encoding($true)))
  "Listo. Abre: " + (Join-Path $Dir 'revision.html')
  exit
}

# ---------------- PAPELEO ----------------
if($Accion -eq 'Papeleo'){
  $cfg = LeerEscenas
  $wpm = 150; if($cfg.palabras_por_minuto){ $wpm = [double]$cfg.palabras_por_minuto }
  $creds = @(); if(Test-Path $CreditosPath){ $creds = @(Import-Csv $CreditosPath -Encoding UTF8) }
  $t = 0.0; $story = New-Object Collections.Generic.List[object]
  $srt = New-Object Text.StringBuilder; $nSrt = 1
  $caps = New-Object Collections.Generic.List[string]
  foreach($e in $cfg.escenas){
    $pal = Palabras $e.texto; $dur = $pal / $wpm * 60.0
    $archivos = @()
    $carp = Join-Path $Dir ("recursos\" + $e.id)
    if(Test-Path $carp){ $archivos = @(Get-ChildItem $carp -File | Select-Object -ExpandProperty Name) }
    $story.Add([pscustomobject]@{ Escena=$e.id; Titulo=$e.titulo; Inicio=(Tiempo $t); Duracion_seg=[int]$dur; Palabras=$pal
      Recursos=$archivos.Count; Archivos=($archivos -join ' | '); Texto=$e.texto })
    if($e.capitulo){ $caps.Add((Tiempo $t) + ' ' + $e.titulo) }
    # subtitulos: trozos de ~10 palabras repartidos en el tiempo de la escena
    $trozos = New-Object Collections.Generic.List[string]; $cur = New-Object Collections.Generic.List[string]
    foreach($w in ($e.texto -split '\s+' | Where-Object { $_ })){
      $cur.Add($w)
      if(($cur.Count -ge 10) -or ($w -match '[\.\?\!:]$' -and $cur.Count -ge 4)){ $trozos.Add(($cur -join ' ')); $cur.Clear() }
    }
    if($cur.Count){ $trozos.Add(($cur -join ' ')) }
    $ts = $t
    foreach($tr in $trozos){
      $d = (Palabras $tr) / $wpm * 60.0
      [void]$srt.AppendLine("$nSrt"); [void]$srt.AppendLine((Tiempo $ts -srt) + ' --> ' + (Tiempo ($ts+$d) -srt)); [void]$srt.AppendLine($tr); [void]$srt.AppendLine('')
      $nSrt++; $ts += $d
    }
    $t += $dur
  }
  $story | Export-Csv (Join-Path $Dir 'storyboard.csv') -NoTypeInformation -Encoding UTF8
  [IO.File]::WriteAllText((Join-Path $Dir 'subtitulos_estimados.srt'), $srt.ToString(), (New-Object Text.UTF8Encoding($false)))

  $d = New-Object Collections.Generic.List[string]
  $d.Add($cfg.descripcion_inicio); $d.Add(''); $d.Add('CAPITULOS (estimados, ajustalos con el video final)')
  foreach($c in $caps){ $d.Add($c) }
  $d.Add(''); $d.Add('CREDITOS DE IMAGENES Y VIDEOS (Wikimedia Commons)')
  foreach($e in $cfg.escenas){
    $carp = Join-Path $Dir ("recursos\" + $e.id); if(-not (Test-Path $carp)){ continue }
    $usados = @(Get-ChildItem $carp -File | Select-Object -ExpandProperty Name)
    $lineas = foreach($u in $usados){ $c = $creds | Where-Object { $_.Carpeta -eq $e.id -and $_.Archivo -eq $u } | Select-Object -First 1
      if($c){ "  - " + $c.Titulo.Replace('File:','') + ' | ' + $c.Autor + ' | ' + $c.Licencia + ' | ' + $c.Fuente } }
    if($lineas){ $d.Add($e.titulo + ':'); foreach($l in $lineas){ $d.Add($l) } }
  }
  [IO.File]::WriteAllText((Join-Path $Dir 'descripcion_y_creditos.txt'), ($d -join "`r`n"), (New-Object Text.UTF8Encoding($true)))
  "Duracion estimada total: " + (Tiempo $t)
  "Listo: storyboard.csv, subtitulos_estimados.srt, descripcion_y_creditos.txt en $Dir"
}
