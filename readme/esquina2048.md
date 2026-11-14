# Esquina 2048

Juego 2048 en el navegador (Phaser 3 + Vue), con modos y temas.

- **URL:** [https://esquinagamers.com/esquina2048/](https://esquinagamers.com/esquina2048/)
- **Local:** `http://127.0.0.1:8000/esquina2048/`
- **Dominio:** EsquinaGamers
- **Doc general:** [../README.md](../README.md)

## Qué hace

- Modos: Clásico 4×4, Grande 5×5, Experto 6×6.
- Temas: Oscuro y Colorido.
- Teclado (PC) y gestos (móvil).
- Récord y partida en `localStorage`.
- Sonido Web Audio (mute opcional).
- AdSense (slots gamers) + GA4 (`GA4_GAMERS_MEASUREMENT_ID`).

## Código principal

| Pieza | Ruta |
| --- | --- |
| Vista Blade | `resources/views/esquina2048.blade.php` |
| Página Vue | `resources/js/Pages/Juegos/Esquina2048.vue` |
| Phaser | `resources/js/Pages/Juegos/esquina2048/` |
| Config | `config/esquina2048.php` |
| Controlador | `app/Http/Controllers/JuegoController.php` → `esquina2048` |
| Alias VPS | `scripts/fix-2048-vps.sh` (solo esquinagamers.com) |

## Eventos GA4 (`tool`: `2048`)

| Evento | Cuándo |
| --- | --- |
| `page_view` | Carga (`tool_page: 2048`) |
| `game_start` | Inicio / montaje |
| `game_over` | Fin de partida (`score`, `is_new_best`) |
| `game_win` | Victoria (sigue jugando) |
| `game_restart` | Reiniciar |
| `game_mode_change` / `game_theme_change` | Cambios de UI |
| `cross_tool_click` | Footer |
