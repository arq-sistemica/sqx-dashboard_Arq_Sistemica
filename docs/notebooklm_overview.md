# Arquitectura Sistémica — Documento de Proyecto

## ¿Qué es este proyecto?

Arquitectura Sistémica es un sistema web personal para el seguimiento, análisis y optimización de bots de trading algorítmico. Conecta dos herramientas profesionales del mundo del trading — StrategyQuant X (donde se crean y backtestean los bots) y MetaTrader 5 (donde los bots operan en el mercado real) — y muestra toda la información unificada en un dashboard web.

El proyecto nació como una herramienta personal y está evolucionando hacia un producto vendible para traders algorítmicos.

---

## El problema que resuelve

Un trader algorítmico puede tener decenas o cientos de bots corriendo simultáneamente en el mercado. Cada bot fue diseñado y backtestado en StrategyQuant X, pero una vez que opera en el mercado real, su performance puede diferir significativamente del backtest.

El problema concreto es:
- Los resultados de backtest están en StrategyQuant X
- Los trades reales están en MetaTrader 5
- No existe una herramienta que conecte ambos mundos y muestre la comparación en tiempo real
- Con muchos bots activos, es imposible hacer este seguimiento manualmente

Arquitectura Sistémica resuelve esto centralizando toda la información en un solo lugar y calculando automáticamente las métricas que importan.

---

## Cómo funciona — La arquitectura

### El flujo de datos

**Desde StrategyQuant X:**
El usuario exporta un archivo CSV con todos sus bots y sus métricas de backtest (profit factor, drawdown, win rate, número de trades, etc.). Este CSV se carga en el dashboard y crea la base de datos de bots.

**Desde MetaTrader 5:**
Un Expert Advisor (programa que corre dentro de MT5) llamado TradeCapture_v3 captura cada trade que se cierra y lo envía automáticamente a una base de datos en la nube (Supabase) via internet. Esto ocurre en tiempo real, sin intervención del usuario.

**En el Dashboard:**
El sistema cruza la información de ambas fuentes usando el "magic number" — un número único que identifica cada estrategia tanto en StrategyQuant como en MetaTrader. Con ese vínculo, el dashboard calcula automáticamente las métricas reales de cada bot y las compara con el backtest.

### La infraestructura

- **Base de datos**: Supabase (PostgreSQL en la nube)
- **Tablas principales**: bots (con métricas SQX), trades (operaciones reales de MT5), user_tokens (autenticación del EA)
- **Frontend**: HTML/CSS/JavaScript puro, sin frameworks
- **EA de captura**: TradeCapture_v3.mq5 corriendo en dos servidores VPS con MetaTrader 5
- **Autenticación**: Supabase Auth con email y contraseña

---

## Los módulos del sistema

### Dashboard Principal (index.html)
El centro de control. Muestra la tabla completa de bots con sus métricas de backtest y live. Al hacer clic en un bot se abre una ficha detallada con toda la información: métricas IS/OOS, equity curve, trades reales, pseudocódigo de la estrategia y notas.

### Ranking Live (ranking.html)
Tabla de posiciones de bots ordenada por performance real. Calcula automáticamente Profit Factor, Drawdown y Win Rate desde los trades reales. Permite ver el historial de rankings semana a semana para detectar tendencias.

### Overlap de Indicadores (overlap.html)
Analiza los pseudocódigos de los bots para detectar qué estrategias comparten indicadores y lógica de entrada. Ayuda a evitar portfolios con estrategias muy correlacionadas. En la visión futura, esta pestaña cruzará los indicadores con los resultados reales para sugerir mejoras.

### Estacionalidad (estacionalidad.html)
Muestra en qué meses del año cada par de divisas históricamente sube o baja. Permite marcar cuáles pares están activos en el portfolio actual para tomar decisiones de activar o pausar bots según el contexto estacional.

---

## El vínculo clave: el Magic Number

El magic number es un número entero que StrategyQuant X asigna a cada estrategia cuando genera el código para MetaTrader 5. Este número viaja con cada trade que el bot ejecuta en el mercado.

En el dashboard, cuando se carga un bot del CSV y se le asigna su magic number, el sistema puede vincular automáticamente todos sus trades históricos y futuros, calcular las métricas reales y mostrarlas en la ficha del bot.

Este vínculo es robusto porque no depende del nombre del bot (que MT5 trunca a 31 caracteres y puede causar confusiones) sino de un número único e inmutable.

---

## El flujo de onboarding

Para un usuario nuevo, el proceso es:

1. **Crear cuenta** en el dashboard (email y contraseña)
2. **Cargar el CSV** de StrategyQuant X — esto crea todos los bots con sus métricas de backtest
3. **Instalar el EA** TradeCapture_v3 en MetaTrader 5 con el token personal (visible en Configuración del dashboard)
4. **Vincular bots con magic numbers** — el dashboard sugiere matches automáticamente comparando nombres
5. **Listo** — los trades llegan solos y las métricas se actualizan en tiempo real

El CSV va primero, el EA después. Sin bots creados, los trades no tienen donde aterrizar.

---

## Las 5 capas del producto

### Capa 1 — Seguimiento (implementado)
Tracking en tiempo real de cada bot: profit factor, drawdown, win rate, lista de trades. Comparación automática backtest vs live.

### Capa 2 — Contexto (en desarrollo)
Análisis de estacionalidad por activo. Saber cuándo activar o pausar un bot según el comportamiento histórico del mercado en ese período del año.

### Capa 3 — Portfolio (diseñado)
Análisis de correlación entre bots activos. Equity curve combinada. Identificar concentración de riesgo en un mismo activo o tipo de estrategia.

### Capa 4 — Optimización (visión)
El cruce más poderoso del sistema: tomar los ingredientes de cada bot (indicadores, condiciones de entrada del pseudocódigo) y cruzarlos con los resultados reales. El sistema identifica qué combinaciones de indicadores correlacionan con buen profit factor, cuáles con alto drawdown, y genera sugerencias concretas para mejorar cada bot.

### Capa 5 — Alertas (futuro)
Notificaciones automáticas cuando algo importante ocurre: drawdown elevado en un bot activo, bot corriendo en una estación históricamente desfavorable, correlación peligrosa entre bots del portfolio.

---

## Estado actual del proyecto

**Funcionando:**
- Dashboard principal con 131 bots cargados
- TradeCapture_v3 corriendo en dos instancias de MT5
- Pipeline completo: MT5 → Supabase → Dashboard
- Métricas live calculadas automáticamente por magic number
- Ranking live actualizado en tiempo real
- Token EA visible y copiable desde el dashboard

**En desarrollo:**
- Pantalla de vinculación de magic numbers (conectar bots CSV con trades MT5)
- TradeCapture con historial completo (hoy solo últimas 24 horas)
- Limpieza de bots duplicados del sistema anterior

**Diseñado pero no implementado:**
- Portfolio Builder con equity curve combinada
- Overlap inteligente con sugerencias de mejora
- Sistema de alertas y notificaciones

---

## La propuesta de valor

Para un trader algorítmico que maneja muchos bots simultáneamente, Arquitectura Sistémica ofrece:

- **Visibilidad total**: todos los bots en un solo lugar, backtest y live juntos
- **Contexto**: saber cuándo el mercado favorece o no a cada estrategia
- **Inteligencia**: identificar qué funciona y qué no en base a datos reales
- **Mejora continua**: ciclo cerrado de seguimiento → análisis → optimización → mejora

Ninguna herramienta de trading ofrece este ciclo completo de forma integrada hoy.

---

## Tecnología utilizada

- **Frontend**: HTML5, CSS3, JavaScript puro (sin frameworks, sin dependencias)
- **Base de datos**: Supabase (PostgreSQL + Auth + Edge Functions)
- **EA de captura**: MQL5 (lenguaje de MetaTrader 5)
- **Hosting**: GitHub Pages
- **Control de versiones**: Git / GitHub
- **Servidor VPS**: Windows Server con MetaTrader 5

---

## Contexto del desarrollador

El proyecto es desarrollado por un trader algorítmico activo que usa las herramientas en su propio trading diario. Esto garantiza que cada feature resuelve un problema real y no teórico. El desarrollo está siendo asistido por Claude (Anthropic) como herramienta de programación.
