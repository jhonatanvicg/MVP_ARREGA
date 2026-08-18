# Paleta de colores — Arrega Industrial

Extraída del sitio web arregaindustrial.com. Lista para usar como referencia de marca en una app web.

## Colores

| Rol | Nombre | HEX | RGB | HSL |
|---|---|---|---|---|
| Primario | Naranja / Ámbar | `#F2A71B` | rgb(242, 167, 27) | hsl(38, 88%, 53%) |
| Secundario | Negro azulado | `#1B1B29` | rgb(27, 27, 41) | hsl(240, 21%, 13%) |
| Acento | Cian / Turquesa | `#1CADE4` | rgb(28, 173, 228) | hsl(196, 78%, 50%) |
| Terciario | Mostaza / Dorado | `#D4A017` | rgb(212, 160, 23) | hsl(43, 80%, 46%) |
| Fondo claro | Gris claro | `#F4F4F2` | rgb(244, 244, 242) | hsl(60, 6%, 95%) |
| Superficie | Blanco | `#FFFFFF` | rgb(255, 255, 255) | hsl(0, 0%, 100%) |
| Texto | Negro | `#1A1A1A` | rgb(26, 26, 26) | hsl(0, 0%, 10%) |
| Utilidad (opcional) | Verde (WhatsApp/éxito) | `#25D366` | rgb(37, 211, 102) | hsl(142, 70%, 49%) |

## Uso sugerido

- **Primario (`#F2A71B`)**: botones de acción (CTA), enlaces destacados, iconos activos, elementos interactivos clave.
- **Secundario (`#1B1B29`)**: header/navbar, footer, texto sobre fondos claros con alto contraste, modo oscuro.
- **Acento (`#1CADE4`)**: gráficos, badges, estados informativos, elementos decorativos que necesiten contraste con el naranja.
- **Terciario (`#D4A017`)**: fondos de secciones promocionales, hover states del primario, variante más sobria del naranja.
- **Gris claro (`#F4F4F2`)**: fondo general de la app, separadores de sección.
- **Blanco (`#FFFFFF`)**: cards, superficies elevadas, texto sobre fondos oscuros.
- **Negro (`#1A1A1A`)**: texto principal, títulos.
- **Verde (`#25D366`)**: solo si necesitas un color de "éxito/confirmación"; no es parte de la identidad visual, viene del botón de WhatsApp.

## Tokens CSS

```css
:root {
  --color-primary: #F2A71B;
  --color-secondary: #1B1B29;
  --color-accent: #1CADE4;
  --color-tertiary: #D4A017;
  --color-bg: #F4F4F2;
  --color-surface: #FFFFFF;
  --color-text: #1A1A1A;
  --color-success: #25D366;
}
```

## Config Tailwind

```js
// tailwind.config.js
colors: {
  primary: '#F2A71B',
  secondary: '#1B1B29',
  accent: '#1CADE4',
  tertiary: '#D4A017',
  background: '#F4F4F2',
  surface: '#FFFFFF',
  ink: '#1A1A1A',
  success: '#25D366',
}
```

## Notas de accesibilidad

- Texto blanco sobre `#F2A71B` (naranja) tiene contraste bajo — usar `#1A1A1A` o `#1B1B29` para texto sobre fondo naranja.
- Texto blanco sobre `#1B1B29` (negro azulado) y sobre `#1CADE4` (cian) tiene buen contraste.
- Texto blanco sobre `#D4A017` (mostaza) es aceptable pero mejor en tamaños grandes/negrita.

## Prompt para pegar en una IA de diseño

> Diseña la interfaz usando esta paleta de marca: naranja/ámbar #F2A71B como color primario (CTAs, acentos interactivos), negro azulado #1B1B29 como color secundario (header, footer, contraste fuerte), cian #1CADE4 como acento decorativo/informativo, mostaza #D4A017 como variante secundaria del naranja para fondos promocionales, gris claro #F4F4F2 como fondo general, blanco #FFFFFF para superficies y cards, y negro #1A1A1A para texto principal. Estilo: industrial, técnico, confiable, alto contraste.
