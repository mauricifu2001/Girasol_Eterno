# Portal Girasol

Pagina romantica con acceso por camara, reconocimiento facial local en el navegador y clave de respaldo.

## Como usarla

1. Abre `config.js` y cambia nombres, textos, fechas, canciones y la clave secreta.
2. Coloca fotos reales de las personas autorizadas dentro de `assets/references/` con los nombres que aparecen en `config.js`, o cambia las rutas por los nombres que prefieras. Esta version ya viene apuntando a archivos `.jpeg`.
3. Usa al menos 2 fotos por persona, de frente y con buena luz.
4. Abre `index.html` con un servidor local. Si solo haces doble clic, algunos navegadores bloquean camara o modelos externos.

## Levantarla rapido en Windows

Puedes usar PowerShell sin instalar nada extra:

```powershell
.\serve.ps1
```

Luego entra a `http://localhost:5500`.

Si tienes Python:

```bash
py -m http.server 5500
```

Luego entra a `http://localhost:5500`.

Si prefieres VS Code, tambien puedes usar una extension como Live Server.

## Importante sobre el reconocimiento

- Esto esta pensado como experiencia tematica, no como sistema de seguridad real.
- El reconocimiento se hace en el navegador, sin backend.
- Si no hay fotos de referencia validas, la pagina seguira dejando entrar con la clave secreta.
- La pagina necesita abrirse por `https` o `localhost` para que el navegador permita camara.

## Que conviene personalizar primero

- `portal.title`
- `portal.secretPhrase`
- `portal.authorizedProfiles`
- `story.title`
- `story.message`
- `story.museum`
- `story.timeline`
- `story.letters`
- `story.playlist`

## Museo de shows

La pagina ya puede mostrar un museo de videos vistos juntos usando enlaces de YouTube.

1. Abre `config.js`.
2. Busca `story.museum.source` y `story.museum.entries`.
3. Si quieres manejarlo facil, deja tus links en `fucknews_links.txt` y la pagina los leera automaticamente.
4. El archivo acepta estas formas por linea:

```txt
https://www.youtube.com/watch?v=XXXXXXXXXXX
Titulo personalizado | https://www.youtube.com/watch?v=XXXXXXXXXXX
2026-03-27 | Fucknews episodio 001 | https://www.youtube.com/watch?v=XXXXXXXXXXX | Ese viernes nos reimos demasiado con este capitulo
```

5. Si prefieres control manual total, tambien puedes agregar objetos con esta forma dentro de `story.museum.entries`:

```js
{
	title: "Fucknews - episodio 001",
	series: "Fucknews Fridays",
	date: "2026-03-27",
	note: "Ese viernes nos reimos durisimo con este capitulo.",
	url: "https://www.youtube.com/watch?v=XXXXXXXXXXX"
}
```

Con eso la pagina sacara automaticamente la miniatura del video y permitira abrirlo dentro de la pagina o en YouTube.

## Ideas para mejorarla despues

- Agregar fotos reales en la pagina principal.
- Poner audios tuyos.
- Incluir un mapa con sus ciudades.
- Conectar una cuenta de Spotify o una galeria.

## Publicarla con GitHub y Netlify

El repositorio ya quedo inicializado y enlazado a GitHub. Si haces cambios en local, este es el flujo:

```powershell
git add .
git commit -m "Describe tu cambio"
git push
```

Para dejarla publica en internet con actualizacion por cada `git push`:

1. Entra a Netlify y crea o inicia sesion en tu cuenta.
2. Elige `Add new site` -> `Import an existing project`.
3. Conecta GitHub y autoriza a Netlify si te lo pide.
4. Selecciona el repo `mauricifu2001/Girasol_Eterno`.
5. Netlify deberia detectar que es una web estatica. El proyecto ya incluye `netlify.toml`, asi que no necesitas comando de build.
6. Publica el sitio.

Despues de eso, cada vez que hagas `git push`, Netlify volvera a desplegar la pagina automaticamente.