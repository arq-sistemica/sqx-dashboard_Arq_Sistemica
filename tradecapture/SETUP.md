# TradeCapture — Guía de instalación
**FED26 Systems — NeuraVPS (Windows Server 2025)**

---

## Resumen del sistema

```
MT5 (DarwinexZero)  ──┐
MT5 (AXISelect)     ──┼──► TradeCapture.mq5 → fed26_trades_[CUENTA].csv
MT5 (PropXP)        ──┘

upload_to_drive.py (viernes 23:00) ──► Google Drive
```

---

## PASO 1 — Instalar el EA en cada cuenta MT5

### 1.1 Copiar el archivo

Copiar `TradeCapture.mq5` a la carpeta de Experts de **cada** terminal MT5:

```
C:\Users\Fede\AppData\Roaming\MetaQuotes\Terminal\[TERMINAL_ID]\MQL5\Experts\
```

Para encontrar el TERMINAL_ID: en MT5 → Archivo → Abrir carpeta de datos.

### 1.2 Compilar en MetaEditor

1. En MT5: Herramientas → MetaEditor (o F4)
2. En el árbol izquierdo: Experts → `TradeCapture.mq5`
3. Compilar (F7)
4. Verificar que dice **0 errores, 0 advertencias**

### 1.3 Adjuntar a un gráfico

1. Abrir cualquier símbolo en cualquier timeframe (ej. EURUSD H1)
2. Arrastrar `TradeCapture` desde el Navegador al gráfico
3. En la ventana de parámetros:
   - `AccountLabel`: poner etiqueta de la cuenta (ej. `DARWINEX`, `AXI`, `PROPXP`)
   - `LogToExpert`: `true`
4. Asegurarse que **"Permitir trading algorítmico"** está activado en MT5

### 1.4 Verificar

En la pestaña **Experts** del terminal, debe aparecer:

```
TradeCapture iniciado — escritura OK: fed26_trades_3000097595_DARWINEX.csv
```

Si aparece `ERROR`, verificar permisos de escritura en la carpeta MQL5\Files\.

**Repetir pasos 1.1 a 1.4 para cada una de las 3 cuentas MT5.**

---

## PASO 2 — Configurar Google Drive API

### 2.1 Crear proyecto y habilitar API

1. Ir a [https://console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto nuevo (ej. `fed26-tradecapture`) o usar uno existente
3. En el menú lateral: **APIs y Servicios → Biblioteca**
4. Buscar **"Google Drive API"** → clic → **Habilitar**

### 2.2 Crear Service Account

1. **IAM y administración → Cuentas de servicio → Crear cuenta de servicio**
2. Nombre: `fed26-drive-uploader`
3. No hace falta asignar roles de proyecto → continuar → listo
4. Clic en la cuenta creada → pestaña **Claves**
5. **Agregar clave → Crear nueva clave → JSON**
6. Descargar el archivo → renombrar a `credentials.json`
7. Copiar `credentials.json` a la misma carpeta donde está `upload_to_drive.py`

### 2.3 Compartir la carpeta de Drive

1. En Google Drive, crear una carpeta (ej. `FED26 Trades`)
2. Click derecho → **Compartir**
3. Pegar el email del service account (está en el `credentials.json`, campo `client_email`)
   Ejemplo: `fed26-drive-uploader@fed26-tradecapture.iam.gserviceaccount.com`
4. Rol: **Editor** → Enviar

### 2.4 Obtener el Folder ID

La URL de la carpeta en Drive tiene esta forma:

```
https://drive.google.com/drive/folders/1ABC123XYZ_ejemplo
                                       ^^^^^^^^^^^^^^^^^^^
                                       este es el folder_id
```

Copiar ese ID para el próximo paso.

---

## PASO 3 — Configurar el script Python

### 3.1 Instalar Python y dependencias (en el VPS)

```bat
pip install google-auth google-auth-oauthlib google-api-python-client
```

### 3.2 Crear config.json

Copiar `config.example.json` → renombrar a `config.json` y completar:

```json
{
  "credentials_file": "credentials.json",
  "drive_folder_id": "1ABC123XYZ_ejemplo",
  "accounts": [
    {
      "label": "DarwinexZero",
      "mt5_files_path": "C:\\Users\\Fede\\AppData\\Roaming\\MetaQuotes\\Terminal\\ABC123\\MQL5\\Files\\"
    },
    {
      "label": "AXISelect",
      "mt5_files_path": "C:\\Users\\Fede\\AppData\\Roaming\\MetaQuotes\\Terminal\\DEF456\\MQL5\\Files\\"
    },
    {
      "label": "PropXP",
      "mt5_files_path": "C:\\Users\\Fede\\AppData\\Roaming\\MetaQuotes\\Terminal\\GHI789\\MQL5\\Files\\"
    }
  ]
}
```

> **Nota**: el TERMINAL_ID de cada instalación MT5 se encuentra abriendo
> MT5 → Archivo → Abrir carpeta de datos. La carpeta que se abre contiene
> la carpeta `MQL5\Files\` donde el EA escribe los CSVs.

### 3.3 Probar antes de la primera subida real

```bat
python upload_to_drive.py --dry-run
```

Debe mostrar la lista de archivos que subiría sin subir nada.

### 3.4 Primera subida

```bat
python upload_to_drive.py
```

Verificar en Google Drive que aparecieron los archivos CSV.

---

## PASO 4 — Configurar Task Scheduler (Windows)

Ejecutar automáticamente cada viernes a las 23:00 hora del servidor.

### 4.1 Abrir Task Scheduler

`Win + R` → `taskschd.msc` → Enter

### 4.2 Crear tarea básica

1. **Acción → Crear tarea básica**
2. Nombre: `FED26 TradeCapture Upload`
3. Desencadenador: **Semanalmente** → Viernes → 23:00
4. Acción: **Iniciar un programa**
   - Programa: `python`
   - Argumentos: `C:\fed26\tradecapture\upload_to_drive.py`
   - Iniciar en: `C:\fed26\tradecapture\`

### 4.3 Configurar para correr sin sesión abierta

1. En las propiedades de la tarea → pestaña **General**
2. Marcar: **"Ejecutar tanto si el usuario inició sesión como si no"**
3. Marcar: **"Ejecutar con los privilegios más altos"**
4. Guardar → ingresar contraseña del usuario del VPS

---

## PASO 5 — Verificación final

### Checklist EA (por cada cuenta)

- [ ] `TradeCapture.mq5` compilado sin errores en MetaEditor
- [ ] EA adjunto a un gráfico en cada cuenta MT5
- [ ] Pestaña Experts muestra "TradeCapture iniciado — escritura OK"
- [ ] Después de cerrar un trade manualmente en demo, aparece una línea nueva en el CSV
- [ ] El CSV tiene headers en la primera línea
- [ ] Múltiples trades generan múltiples líneas (append correcto)
- [ ] Los EAs operativos siguen funcionando normalmente

### Checklist Python

- [ ] `python upload_to_drive.py --dry-run` muestra los archivos sin error
- [ ] Primera subida crea los archivos en Drive
- [ ] Segunda subida sobreescribe sin duplicar (verificar que sigue habiendo un solo archivo por nombre)
- [ ] `upload_log.txt` registra cada ejecución con timestamp y resultado
- [ ] Task Scheduler ejecuta correctamente el viernes (verificar en "Historial" de la tarea)

---

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| "TradeCapture ERROR — no se puede escribir" | Permisos de carpeta en MT5 | Verificar que MT5 tiene acceso a MQL5\Files\ |
| CSV vacío después de trades | EA adjunto pero "Algo trading" desactivado | Activar el botón verde en MT5 |
| `[ENTRY_NOT_FOUND]` en comment | Trade muy antiguo o historial reducido | Normal para trades de más de 2 años |
| `FileNotFoundError` en Python | Ruta de TERMINAL_ID incorrecta | Abrir MT5 → Archivo → Abrir carpeta de datos para confirmar la ruta |
| `403 Forbidden` en Drive | Carpeta no compartida con service account | Repetir paso 2.3 |
| SL = 0.00000 en el CSV | Bot cerró por barras (normal) | Comportamiento esperado, no es un error |
