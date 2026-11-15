<#
  GRÁFICOS PROPIOS - Grenfell (Fábrica de Casos)
  Genera las tarjetas, cifras, líneas de tiempo y esquemas propios (1920x1080 PNG) en recursos\<escena>\grafico_*.png
  Uso (desde la carpeta del proyecto):  powershell -ExecutionPolicy Bypass -File .\herramientas_graficos.ps1
  Todos los textos salen de guion_final.txt y verificacion.md. Sin logos ni marcas de empresas.
#>
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$Base = Split-Path -Parent $MyInvocation.MyCommand.Path
$Rec  = Join-Path $Base 'recursos'

# ---------- estilo ----------
$C = @{
  fondo  = [Drawing.ColorTranslator]::FromHtml('#111111')
  blanco = [Drawing.ColorTranslator]::FromHtml('#F2F2F2')
  gris   = [Drawing.ColorTranslator]::FromHtml('#9A9A9A')
  grisO  = [Drawing.ColorTranslator]::FromHtml('#3A3A3A')
  naranja= [Drawing.ColorTranslator]::FromHtml('#F5A524')
  rojo   = [Drawing.ColorTranslator]::FromHtml('#E5484D')
  alu    = [Drawing.ColorTranslator]::FromHtml('#B9C0C8')
  papel  = [Drawing.ColorTranslator]::FromHtml('#EFE9DC')
  tinta  = [Drawing.ColorTranslator]::FromHtml('#1E2A44')
}
$FAM = 'Segoe UI'
$M = 140   # margen lateral
$W = 1920; $H = 1080

function Lienzo {
  $b = New-Object Drawing.Bitmap $W, $H
  $g = [Drawing.Graphics]::FromImage($b)
  $g.Clear($C.fondo)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.InterpolationMode = 'HighQualityBicubic'
  return ,@($b, $g)
}
function Pincel($col){ New-Object Drawing.SolidBrush $col }
function Lapiz($col,[float]$ancho=4){ $p = New-Object Drawing.Pen $col, $ancho; $p.StartCap='Round'; $p.EndCap='Round'; $p }
function Letra([float]$tam,[string]$estilo='Regular',[string]$fam=$FAM){ New-Object Drawing.Font $fam, $tam, ([Drawing.FontStyle]$estilo), ([Drawing.GraphicsUnit]::Pixel) }

# Texto en un rectángulo; si no cabe, achica la letra hasta que entre
function Texto($g,[string]$t,[float]$tam,$col,[float]$x,[float]$y,[float]$w,[float]$h,[string]$estilo='Regular',[string]$al='Near',[string]$alV='Near',[string]$fam=$FAM){
  $sf = New-Object Drawing.StringFormat
  $sf.Alignment = $al; $sf.LineAlignment = $alV
  $f = Letra $tam $estilo $fam
  while($tam -gt 12){
    $sz = $g.MeasureString($t, $f, [int]$w, $sf)
    if($sz.Height -le $h){ break }
    $tam -= 2; $f.Dispose(); $f = Letra $tam $estilo $fam
  }
  $g.DrawString($t, $f, (Pincel $col), (New-Object Drawing.RectangleF $x, $y, $w, $h), $sf)
  $f.Dispose()
}
function Medir($g,[string]$t,[float]$tam,[float]$w,[string]$estilo='Regular'){
  $f = Letra $tam $estilo; $sf = New-Object Drawing.StringFormat; $sf.Alignment='Near'
  $h = $g.MeasureString($t, $f, [int]$w, $sf).Height; $f.Dispose(); return [float]$h
}
function Rotulo($g,[string]$t,$col=$C.naranja){
  # etiqueta pequeña arriba a la izquierda + raya de acento
  $g.FillRectangle((Pincel $col), $M, 92, 90, 8)
  Texto $g $t 34 $col $M 112 ($W-2*$M) 60 'Bold'
}
function Fuente($g,[string]$t){
  $g.DrawLine((Lapiz $C.grisO 2), $M, 968, $W-$M, 968)
  Texto $g $t 28 $C.gris $M 984 ($W-2*$M) 70
}
function Guardar($par,[string]$escena,[string]$nombre){
  $dir = Join-Path $Rec $escena
  if(-not (Test-Path $dir)){ New-Item -ItemType Directory -Force $dir | Out-Null }
  $ruta = Join-Path $dir $nombre
  $par[0].Save($ruta, [Drawing.Imaging.ImageFormat]::Png)
  $par[1].Dispose(); $par[0].Dispose()
  "ok  $escena\$nombre"
}

# ---------- plantillas ----------
function Tarjeta($escena,$nombre,$numero,$titulo,$empresa,$sub){
  $p = Lienzo; $g = $p[1]
  $g.FillRectangle((Pincel $C.naranja), $M, 300, 12, 420)
  Texto $g $numero 60 $C.naranja ($M+60) 300 1500 90 'Bold'
  Texto $g $titulo 150 $C.blanco ($M+52) 380 1640 210 'Bold'
  Texto $g $empresa 72 $C.naranja ($M+60) 590 1500 100
  Texto $g $sub 40 $C.gris ($M+60) 690 1500 120
  Guardar $p $escena $nombre
}
function Cifra($escena,$nombre,$rotulo,$cifra,$linea1,$linea2,$fuente,$col=$C.naranja,[float]$tam=330){
  $p = Lienzo; $g = $p[1]
  Rotulo $g $rotulo
  Texto $g $cifra $tam $col $M 190 ($W-2*$M) 450 'Bold' 'Center' 'Center'
  Texto $g $linea1 64 $C.blanco $M 640 ($W-2*$M) 100 'Bold' 'Center'
  if($linea2){ Texto $g $linea2 40 $C.gris $M 750 ($W-2*$M) 150 'Regular' 'Center' }
  Fuente $g $fuente
  Guardar $p $escena $nombre
}
function Cita($escena,$nombre,$rotulo,$contexto,$original,$traduccion,$fuente,$colRot=$C.naranja){
  $p = Lienzo; $g = $p[1]
  Rotulo $g $rotulo $colRot
  if($contexto){ Texto $g $contexto 38 $C.gris $M 190 ($W-2*$M) 110 }
  $y0 = 320
  $g.FillRectangle((Pincel $C.naranja), $M, $y0, 10, 560)
  if($original){
    $ancho = $W-2*$M-50
    $h1 = [Math]::Min(210, (Medir $g $original 44 $ancho 'Italic'))
    $h2 = [Math]::Min(330, (Medir $g $traduccion 66 $ancho 'Bold'))
    $yA = $y0 + (560 - ($h1 + 40 + $h2))/2
    Texto $g $original 44 $C.gris ($M+50) $yA $ancho ($h1+4) 'Italic'
    Texto $g $traduccion 66 $C.blanco ($M+50) ($yA+$h1+40) $ancho ($h2+4) 'Bold'
  } else {
    Texto $g $traduccion 76 $C.blanco ($M+50) $y0 ($W-2*$M-50) 560 'Bold' 'Near' 'Center'
  }
  Fuente $g $fuente
  Guardar $p $escena $nombre
}
# Línea de tiempo: $hitos = @( @{f='2005'; t='texto'; c=color}, ... )
function LineaTiempo($escena,$nombre,$rotulo,$hitos,$fuente,[float]$tamT=40,[float]$anchoT=0,[switch]$alternar){
  $p = Lienzo; $g = $p[1]
  Rotulo $g $rotulo
  $y = if($alternar){ 560 } else { 400 }
  $g.DrawLine((Lapiz $C.grisO 6), $M, $y, $W-$M, $y)
  $n = $hitos.Count
  $paso = ($W-2*$M)/$n
  if($anchoT -le 0){ $anchoT = if($alternar){ [Math]::Min(2*$paso-24, 520) } else { [Math]::Min($paso-30, 560) } }
  for($i=0; $i -lt $n; $i++){
    $h = $hitos[$i]; $x = $M + ($i+0.5)*$paso
    $col = if($h.c){ $h.c } else { $C.naranja }
    $g.FillEllipse((Pincel $col), $x-18, $y-18, 36, 36)
    $arriba = $alternar -and ($i % 2 -eq 1)
    $tx = [Math]::Max(50, [Math]::Min($x - $anchoT/2, $W-50-$anchoT))
    if($arriba){
      $g.DrawLine((Lapiz $col 3), $x, $y-26, $x, $y-70)
      $ht = [Math]::Min(230, (Medir $g $h.t $tamT $anchoT))
      Texto $g $h.t $tamT $C.blanco $tx (480-$ht) $anchoT ($ht+4) 'Regular' 'Center'
      Texto $g $h.f ($tamT+8) $col $tx (480-$ht-66) $anchoT 64 'Bold' 'Center'
    } else {
      $g.DrawLine((Lapiz $col 3), $x, $y+26, $x, $y+70)
      Texto $g $h.f ($tamT+8) $col $tx ($y+80) $anchoT 70 'Bold' 'Center'
      Texto $g $h.t $tamT $C.blanco $tx ($y+152) $anchoT ($(if($alternar){240}else{380})) 'Regular' 'Center'
    }
  }
  Fuente $g $fuente
  Guardar $p $escena $nombre
}

$IF  = 'Fuente: Informe final Grenfell Tower Inquiry, 2024'
$F1  = 'Fuente: Informe de la Fase 1, Grenfell Tower Inquiry, 2019'

# =================== 01 GANCHO ===================
Cifra '01_Gancho' 'grafico_01_cifra_72.png' 'TORRE GRENFELL · LONDRES · 14 DE JUNIO DE 2017' '72' 'personas murieron' 'en un incendio que empezó en una cocina del cuarto piso' $IF $C.rojo

# =================== 02 LA REFORMA ===================
Cifra '02_La_reforma' 'grafico_02_cifra_293368.png' 'LA REFORMA · 2015-2016' '£293.368' 'de ahorro por elegir paneles de aluminio' 'Lo que la constructora le presentó a la administradora (KCTMO) en lugar de la opción de zinc' "$IF (vol. 4, 55.58)" $C.naranja 260

# =================== 03 LA NOCHE ===================
Cifra '03_La_noche_y_el_panel' 'grafico_03_cifra_297.png' 'LA NOCHE DEL INCENDIO' '297' 'personas en la torre' 'Torre de 24 pisos · 14 de junio de 2017' "$F1 (2.11)"

# Orden de quedarse en casa
$p = Lienzo; $g = $p[1]
Rotulo $g 'LA ORDEN: «QUÉDENSE EN CASA»'
Texto $g '00:54' 150 $C.naranja $M 250 760 200 'Bold' 'Center'
Texto $g 'primera llamada al 999' 44 $C.blanco $M 450 760 70 'Regular' 'Center'
Texto $g '→' 150 $C.gris 860 250 200 200 'Bold' 'Center'
Texto $g '02:47' 150 $C.rojo 1020 250 760 200 'Bold' 'Center'
Texto $g 'se retira la orden de quedarse' 44 $C.blanco 1020 450 760 70 'Regular' 'Center'
Texto $g 'Según el informe de 2019, la evacuación se debió decidir entre la 1:30 y la 1:50.' 52 $C.blanco $M 640 ($W-2*$M) 200 'Bold' 'Center'
Fuente $g "$F1 (2.19)"
Guardar $p '03_La_noche_y_el_panel' 'grafico_03_orden_quedarse.png'

# =================== 04 EXPEDIENTE 1 ===================
Tarjeta '04_Expediente_1_el_panel' 'grafico_04_tarjeta_expediente1.png' 'EXPEDIENTE 1' 'EL PANEL' '(Arconic)' 'Reynobond PE · fabricado en Francia por una filial de Arconic, empresa estadounidense'

# Panel en corte
$p = Lienzo; $g = $p[1]
Rotulo $g 'EL PANEL EN CORTE · REYNOBOND PE'
$px = 260; $pw = 900; $py = 360
$g.FillRectangle((Pincel $C.alu), $px, $py, $pw, 46)
$g.FillRectangle((Pincel $C.naranja), $px, $py+46, $pw, 210)
$g.FillRectangle((Pincel $C.alu), $px, $py+256, $pw, 46)
$g.DrawRectangle((Lapiz $C.blanco 3), $px, $py, $pw, 302)
$lx = $px + $pw + 40
$g.DrawLine((Lapiz $C.blanco 3), $px+$pw-60, $py+23, $lx+40, $py+23)
Texto $g 'Aluminio' 52 $C.blanco ($lx+60) ($py-15) 560 80 'Bold'
$g.DrawLine((Lapiz $C.blanco 3), $px+$pw-60, $py+151, $lx+40, $py+151)
Texto $g 'Polietileno' 52 $C.naranja ($lx+60) ($py+105) 560 80 'Bold'
Texto $g 'un plástico que arde bien' 36 $C.gris ($lx+60) ($py+175) 560 60
$g.DrawLine((Lapiz $C.blanco 3), $px+$pw-60, $py+279, $lx+40, $py+279)
Texto $g 'Aluminio' 52 $C.blanco ($lx+60) ($py+240) 560 80 'Bold'
Texto $g 'Dos láminas finas de aluminio y, en medio, un relleno de plástico: polietileno.' 44 $C.blanco $M 740 ($W-2*$M) 140 'Regular' 'Center'
Texto $g 'Dibujo ilustrativo, no a escala' 26 $C.gris $M 880 ($W-2*$M) 40 'Italic' 'Center'
Fuente $g "$IF (vol. 1, 2.21)"
Guardar $p '04_Expediente_1_el_panel' 'grafico_04_panel_en_corte.png'

# Panel plano vs casete (vista lateral)
$p = Lienzo; $g = $p[1]
Rotulo $g 'DOS FORMAS DE PONER EL MISMO PANEL'
$gl = Lapiz $C.gris 10; $pl = Lapiz $C.alu 14; $ac = Lapiz $C.naranja 14
# izquierda: plano atornillado
$wx = 420
$g.DrawLine($gl, $wx, 260, $wx, 820)                      # pared
$g.DrawLine($pl, $wx+120, 300, $wx+120, 780)              # panel plano
foreach($yy in 340,540,740){ $g.DrawLine((Lapiz $C.blanco 6), $wx, $yy, $wx+120, $yy); $g.FillEllipse((Pincel $C.blanco), $wx+110, $yy-10, 20, 20) }
Texto $g 'PLANO' 60 $C.blanco 160 830 640 80 'Bold' 'Center'
Texto $g 'atornillado a la pared' 38 $C.gris 160 905 640 60 'Regular' 'Center'
# derecha: casete (bordes doblados, colgado)
$wx2 = 1240
$g.DrawLine($gl, $wx2, 260, $wx2, 820)
$pts = @( (New-Object Drawing.PointF ($wx2+40),300), (New-Object Drawing.PointF ($wx2+130),300), (New-Object Drawing.PointF ($wx2+130),780), (New-Object Drawing.PointF ($wx2+40),780) )
$g.DrawLines($ac, [Drawing.PointF[]]$pts)
$g.DrawLine((Lapiz $C.blanco 6), $wx2, 300, $wx2+40, 300); $g.DrawLine((Lapiz $C.blanco 6), $wx2+40, 300, $wx2+40, 330)   # gancho
Texto $g 'CASETE' 60 $C.naranja 980 830 640 80 'Bold' 'Center'
Texto $g 'bordes doblados, colgado como una bandeja' 38 $C.gris 900 905 800 60 'Regular' 'Center'
Texto $g 'En Grenfell se usó en forma de casete' 46 $C.blanco 880 180 900 70 'Bold' 'Center'
Texto $g 'Vista de lado · dibujo ilustrativo' 26 $C.gris 160 180 640 40 'Italic' 'Center'
$g.DrawLine((Lapiz $C.grisO 2), $M, 968, $W-$M, 968)
Texto $g "$IF (vol. 1, 2.21)" 28 $C.gris $M 984 ($W-2*$M) 70
Guardar $p '04_Expediente_1_el_panel' 'grafico_04_plano_vs_casete.png'

# Línea de tiempo de Arconic
LineaTiempo '04_Expediente_1_el_panel' 'grafico_04_linea_tiempo_arconic.png' 'EXPEDIENTE 1 · LO QUE SABÍA LA EMPRESA DEL PANEL' @(
  @{ f='2/12/2004'; t='Ensayo de fuego del panel en casete, en Francia. Se para a los 850 segundos (unos 14 minutos).' },
  @{ f='Enero 2005'; t='Informe de clasificación: el casete no obtiene ninguna clasificación.'; c=$C.rojo },
  @{ f='Marzo 2010'; t='Correo interno: hay que mantenerlo «MUY CONFIDENCIAL».' },
  @{ f='2013'; t='Decide certificar el panel solo como clase E. No se lo dicen a los clientes británicos.'; c=$C.rojo }
) "$IF (vol. 1, 2.22 y 2.25; vol. 2, 17.13-17.16 y 20.7)" 38

Cita '04_Expediente_1_el_panel' 'grafico_04_cita_very_confidential.png' 'EXPEDIENTE 1 · CORREO INTERNO, MARZO DE 2010' 'Un responsable técnico, sobre que el panel en casete no llegaba a la clase B:' '"…we have to keep as VERY CONFIDENTIAL!!!!"' '«…hay que mantenerlo MUY CONFIDENCIAL»' "$IF (vol. 2, 20.7)"

Cita '04_Expediente_1_el_panel' 'grafico_04_cita_estrategia_deliberada.png' 'EXPEDIENTE 1 · LO QUE CONCLUYE EL INFORME' 'Sobre no contarles a los clientes británicos la clase E (2013):' '"That was not an oversight. It reflected a deliberate strategy"' '«No fue un descuido. Reflejaba una estrategia deliberada»' "$IF (vol. 1, 2.25). Arconic niega haber vendido un producto inseguro y haber engañado."

# =================== 05 EXPEDIENTE 2 ===================
Tarjeta '05_Expediente_2_el_aislante' 'grafico_05_tarjeta_expediente2.png' 'EXPEDIENTE 2' 'EL AISLANTE' '(Celotex)' 'Celotex RS5000 · espuma plástica (PIR), el aislante principal de la torre'

LineaTiempo '05_Expediente_2_el_aislante' 'grafico_05_linea_tiempo_ensayo.png' 'EXPEDIENTE 2 · EL ENSAYO CON AYUDA' @(
  @{ f='14/2/2014'; t='Primer ensayo grande de fuego del sistema. FALLA.'; c=$C.rojo },
  @{ f='2/5/2014'; t='Segundo ensayo, con dos juegos de placas de óxido de magnesio añadidas en puntos críticos. PASA.' },
  @{ f='Después'; t='El informe del laboratorio no menciona esas placas. Se vende como apto para más de 18 metros.'; c=$C.rojo }
) "$IF (vol. 1, 2.29-2.30; vol. 2, 24.53-24.64)" 42

# Banco de ensayo (dibujo propio)
$p = Lienzo; $g = $p[1]
Rotulo $g 'EXPEDIENTE 2 · LA PARED DE PRUEBA (2/5/2014)'
$bx = 330; $by = 210; $bw = 420; $bh = 700
$g.FillRectangle((Pincel $C.grisO), $bx, $by, $bw, $bh)                 # pared principal
$g.FillPolygon((Pincel ([Drawing.ColorTranslator]::FromHtml('#2A2A2A'))), [Drawing.PointF[]]@((New-Object Drawing.PointF ($bx+$bw),$by),(New-Object Drawing.PointF ($bx+$bw+200),($by+60)),(New-Object Drawing.PointF ($bx+$bw+200),($by+$bh+60)),(New-Object Drawing.PointF ($bx+$bw),($by+$bh))))   # ala lateral
$g.DrawRectangle((Lapiz $C.gris 3), $bx, $by, $bw, $bh)
$g.FillRectangle((Pincel ([Drawing.ColorTranslator]::FromHtml('#000000'))), $bx+120, $by+$bh-190, 220, 190)   # cámara de combustión
$g.FillPolygon((Pincel $C.naranja), [Drawing.PointF[]]@((New-Object Drawing.PointF ($bx+150),($by+$bh)),(New-Object Drawing.PointF ($bx+230),($by+$bh-160)),(New-Object Drawing.PointF ($bx+310),($by+$bh))))
foreach($yy in ($by+430),($by+150)){ $dp = Lapiz $C.blanco 3; $dp.DashStyle='Dash'; $g.DrawLine($dp, $bx, $yy, $bx+$bw, $yy) }
# placas añadidas (posición ilustrativa)
$g.FillRectangle((Pincel $C.rojo), $bx+40, $by+300, $bw-80, 26)
$g.FillRectangle((Pincel $C.rojo), $bx+40, $by+40, $bw-80, 26)
$tx = 1060
Texto $g 'Placas de óxido de magnesio añadidas' 50 $C.rojo $tx 250 720 140 'Bold'
Texto $g 'Dos juegos, en puntos críticos, «para asegurarse de que pasara».' 42 $C.blanco $tx 400 720 160
Texto $g 'El informe del laboratorio no las mencionaba: «materialmente incompleto y engañoso».' 42 $C.blanco $tx 580 720 220
Texto $g 'Dibujo ilustrativo: la posición de las placas no es la real' 26 $C.gris $bx 925 900 40 'Italic'
Fuente $g "$IF (vol. 1, 2.29; vol. 2, 24.64)"
Guardar $p '05_Expediente_2_el_aislante' 'grafico_05_banco_de_ensayo.png'

Cita '05_Expediente_2_el_aislante' 'grafico_05_cita_plan_deshonesto.png' 'EXPEDIENTE 2 · LO QUE CONCLUYE EL INFORME' 'Sobre Celotex, con la complicidad del laboratorio que hizo el ensayo (BRE):' '"embarked on a dishonest scheme to mislead its customers and the wider market"' '«se embarcó en un plan deshonesto para engañar a sus clientes y al mercado»' "$IF (vol. 1, 2.28-2.29). Celotex dice que el sistema ensayado era muy distinto al de Grenfell."

# =================== 06 EXPEDIENTE 3 ===================
Tarjeta '06_Expediente_3_el_producto_que_cambio' 'grafico_06_tarjeta_expediente3.png' 'EXPEDIENTE 3' 'EL PRODUCTO QUE CAMBIÓ' '(Kingspan)' 'Kingspan K15 · aislante usado en menor cantidad en la torre'

LineaTiempo '06_Expediente_3_el_producto_que_cambio' 'grafico_06_linea_tiempo_k15.png' 'EXPEDIENTE 3 · EL PRODUCTO QUE CAMBIÓ' @(
  @{ f='2005'; t='Un sistema con el producto original pasa un ensayo grande de fuego.' },
  @{ f='2006'; t='La empresa cambia la composición del producto. No lo dice.'; c=$C.rojo },
  @{ f='2007 - 2008'; t='Ensayos con el producto nuevo: «desastrosos». Uno, «un infierno furioso».'; c=$C.rojo },
  @{ f='2009'; t='Certificado con «afirmaciones falsas». Un correo lo celebra: «fanbloodytastic».' }
) "$IF (vol. 1, 2.33-2.35; vol. 2, 22.56 y 22.97)" 38

Cita '06_Expediente_3_el_producto_que_cambio' 'grafico_06_cita_mercado_falso.png' 'EXPEDIENTE 3 · LO QUE CONCLUYE EL INFORME' 'Sobre el aislante K15:' '"knowingly created a false market"' '«creó a sabiendas un mercado falso»' "$IF (vol. 1, 2.32). Kingspan dice que el tipo de aislante no fue lo importante."

Cita '06_Expediente_3_el_producto_que_cambio' 'grafico_06_cita_datos_inspector.png' 'EXPEDIENTE 3 · CORREO INTERNO' 'Sobre el inspector que dio el certificado de 2009:' '"We threw every bit of fire test data we could at him"' '«Le lanzamos todos los datos de ensayos de fuego que pudimos»' 'Fuente: correo interno citado en las audiencias de la Grenfell Tower Inquiry (Inside Housing)'

# =================== 07 EL PAPEL DE 2007 ===================
$p = Lienzo; $g = $p[1]
Rotulo $g 'OSLO · SEPTIEMBRE DE 2007 · NOTAS DE UN GERENTE DE MARKETING'
$g.FillRectangle((Pincel $C.papel), 260, 200, 1400, 470)
$fuentePapel = if((New-Object Drawing.Text.InstalledFontCollection).Families.Name -contains 'Segoe Print'){ 'Segoe Print' } else { 'Georgia' }
Texto $g '"...one building made out [of] PE core is in [a] fire and will kill 60 to 70 persons, what is the responsibility of the ACM supplier?"' 50 $C.tinta 330 240 1260 400 'Regular' 'Near' 'Center' $fuentePapel
Texto $g '¿Qué pasará si un solo edificio con núcleo de polietileno se incendia y mata a 60 o 70 personas? ¿Cuál es la responsabilidad del proveedor del panel?' 46 $C.blanco $M 700 ($W-2*$M) 170 'Bold' 'Center'
Texto $g 'Recreación propia del texto. Era la pregunta hipotética de un consultor externo, anotada por el gerente.' 26 $C.gris $M 890 ($W-2*$M) 60 'Italic' 'Center'
Fuente $g "$IF (vol. 2, 20.2)"
Guardar $p '07_El_papel_de_2007' 'grafico_07_nota_2007.png'

Cifra '07_El_papel_de_2007' 'grafico_07_2007_2017.png' 'DIEZ AÑOS' '2007 → 2017' 'de las notas de Oslo al incendio de Grenfell' 'En 2007 la pregunta hablaba de 60 o 70 muertos. En 2017 murieron 72 personas.' "$IF (vol. 2, 20.2; vol. 1)" $C.naranja 230

# =================== 08 EL INFORME ===================
Cita '08_El_informe' 'grafico_08_cita_evitables.png' 'EL INFORME FINAL · 4 DE SEPTIEMBRE DE 2024' 'Martin Moore-Bick, presidente de la investigación, al presentar el informe:' $null '«La verdad simple es que todas las muertes que ocurrieron eran evitables»' 'Fuente: rueda de prensa de presentación del informe final, 4/9/2024 (Al Jazeera)'

Cita '08_El_informe' 'grafico_08_cita_incompetencia.png' 'EL INFORME FINAL · 4 DE SEPTIEMBRE DE 2024' 'Moore-Bick, al resumir quiénes fallaron:' '"in most cases through incompetence, but in some cases through dishonesty and greed"' '«en la mayoría de los casos por incompetencia, pero en algunos por deshonestidad y codicia»' 'Fuente: rueda de prensa de presentación del informe final, 4/9/2024 (CBS News, Al Jazeera)'

Cifra '08_El_informe' 'grafico_08_expedientes_fiscalia.png' '30 DE SEPTIEMBRE DE 2026 · EXPEDIENTES A LA FISCALÍA' '54 + 20' '54 personas y 20 organizaciones' 'Entregar los expedientes no es acusar. Hasta hoy nadie está acusado ni condenado. La Fiscalía decidirá antes del 14 de junio de 2027.' 'Fuente: Policía Metropolitana de Londres, 30/9/2026' $C.naranja 260

LineaTiempo '08_El_informe' 'grafico_08_linea_tiempo_2004_2027.png' 'DE LOS ENSAYOS AL INFORME · 2004-2027' @(
  @{ f='2004'; t='Ensayo del panel en casete: se para a los 850 s' },
  @{ f='2005'; t='Ensayo del K15 con el producto original' },
  @{ f='2007'; t='Notas de Oslo: «60 o 70 personas»' },
  @{ f='2010'; t='Correo «VERY CONFIDENTIAL»' },
  @{ f='2014'; t='Ensayos de Celotex: falla en febrero, pasa en mayo' },
  @{ f='2015-2016'; t='Reforma de la torre' },
  @{ f='14/6/2017'; t='Incendio: 72 muertos'; c=$C.rojo },
  @{ f='2019'; t='Informe de la Fase 1' },
  @{ f='4/9/2024'; t='Informe final' },
  @{ f='30/9/2026'; t='Expedientes a la Fiscalía: 54 personas y 20 organizaciones' },
  @{ f='Antes del 14/6/2027'; t='Decisión de la Fiscalía'; c=$C.rojo }
) 'Fuentes: Informe final Grenfell Tower Inquiry (2024), Informe Fase 1 (2019), Policía Metropolitana (30/9/2026)' 30 280 -alternar

"Listo."
