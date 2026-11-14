# Esquina Blocks

Puzzle tipo Block Blast: arrastra piezas a un tablero 8×8, completa filas/columnas y suma puntos.

- **URL:** [https://esquinagamers.com/esquinablocks/](https://esquinagamers.com/esquinablocks/)
- **Local:** `http://127.0.0.1:8000/esquinablocks/`
- **Dominio:** EsquinaGamers
- **Doc general:** [../README.md](../README.md)

## Qué hace

- Tablero 8×8 + bandeja de 3 piezas (drag & drop ratón/táctil).
- Limpieza de filas y columnas; combos visuales y puntos extra.
- Temas Oscuro / Colorido.
- Partida y récord en `localStorage`; mute de SFX.
- Reparto de piezas **sesgado** hacia más dobles/triples (mira el tablero; no es 100 % aleatorio).
- AdSense (slots gamers) + GA4 (`GA4_GAMERS_MEASUREMENT_ID`).

## Código principal

| Pieza | Ruta |
| --- | --- |
| Vista Blade | `resources/views/esquinablocks.blade.php` |
| Página Vue | `resources/js/Pages/Juegos/EsquinaBlocks.vue` |
| Phaser | `resources/js/Pages/Juegos/esquinablocks/` (`GameScene`, `pieces`, `board`, `sfx`, `persist`) |
| Config | `config/esquinablocks.php` |
| Controlador | `app/Http/Controllers/JuegoController.php` → `esquinaBlocks` |

## Eventos GA4 (`tool`: `blocks`)

| Evento | Cuándo |
| --- | --- |
| `page_view` | Carga (`tool_page: blocks`) |
| `game_start` | Inicio / reinicio |
| `game_over` | Fin (`score`, `is_new_best`) |
| `game_restart` / `game_theme_change` | UI |
| `cross_tool_click` | Footer |
