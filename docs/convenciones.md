# Convenciones de Trabajo

## PowerShell
- Siempre nombrar la terminal como **PowerShell**
- Comandos **uno por uno** — nunca pegados juntos
- Siempre incluir el `cd` al inicio de cada sesión:
  ```
  cd "C:\Users\Fede\Desktop\claude code\Arquitectura Sistemica"
  ```

## Git / GitHub
Secuencia estándar al terminar cada feature:
```
git add [archivo]
```
```
git commit -m "tipo: descripción corta"
```
```
git push
```

Tipos de commit: `feat` (nueva función), `fix` (corrección), `docs` (documentación), `refactor`

## Edición de código
- Los archivos HTML son grandes (~4000 líneas) — leer solo el rango necesario
- Siempre leer antes de editar
- `render()` siempre después de modificar la tabla de bots
- No agregar librerías externas
- No romper el parser CSV existente

## Seguridad
- `vps_secrets.py` NUNCA commitear (está en .gitignore)
- Service key de Supabase SOLO en el VPS
- Publishable key es segura para el frontend

## Arrancar una sesión nueva
1. Abrir PowerShell
2. `cd "C:\Users\Fede\Desktop\claude code\Arquitectura Sistemica"`
3. `claude`
4. Claude lee CLAUDE.md automáticamente — contexto completo desde el inicio
