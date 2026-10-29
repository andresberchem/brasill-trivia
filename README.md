# 🇧🇷 Brasil Trivia

Juego de trivia sobre Brasil con preguntas en **inglés**, apoyo en **español y portugués** (texto traducido y lectura en voz alta), ranking en vivo y panel de administración. Backend **serverless con Firebase Firestore**; frontend en **HTML + CSS + JavaScript** (ES Modules, sin frameworks).

> Proyecto de la actividad *"Elige Tu Propio Reto en la Nube con Firebase"* · Tecnología en Análisis y Desarrollo de Software · SENA 2026.

## 🎯 Características

- 56 preguntas base (geografía, cultura, deportes e historia) + las que se agreguen desde el panel Admin.
- Interfaz en EN / ES / PT y voz (Web Speech API) en EN / ES / PT.
- Retroalimentación después de cada respuesta, explicada en el idioma elegido.
- Fotos automáticas por pregunta desde Wikipedia (con emoji de respaldo).
- Temporizador configurable, rachas con bono, confeti y sonidos (con botón de silencio).
- Comodines: **50/50**, **+10 s** y **Skip** (uno de cada uno por partida).
- Niveles de dificultad (fácil / medio / difícil) y logros guardados en el navegador.
- Ranking global **en tiempo real** con filtro por programa de formación.
- **Panel Admin** (PIN) con CRUD de preguntas guardadas en Firestore.

## 🏗️ Arquitectura

| Capa | Tecnología |
|---|---|
| Frontend | HTML, CSS, JavaScript (módulos ES) |
| Base de datos | Cloud Firestore (NoSQL) |
| Conexión | Firebase SDK v10 por CDN (`initializeApp`) |
| Tiempo real | `onSnapshot` (Opción C de la actividad) |
| Publicación | GitHub Pages |

**Colecciones de Firestore**

- `scores` → `{ name, program, score, hits, total, at }`
- `questions` → `{ q, es, pt, o[], a, c, d, w, e, x[] }`

**CRUD en la app**

| Operación | Dónde |
|---|---|
| Create | `addDoc` al terminar una partida (puntaje) y al guardar una pregunta en Admin |
| Read | `onSnapshot` del ranking y de las preguntas |
| Update | ✏️ renombrar tu puntaje · editar una pregunta en Admin |
| Delete | 🗑️ borrar tu puntaje · borrar una pregunta en Admin |

## 📁 Estructura

```
brasil-trivia/
├── index.html     → estructura de la página
├── style.css      → diseño
├── app.js         → lógica del juego + Firebase
├── questions.js   → preguntas base (tanda 1)
├── questions2.js  → preguntas base (tanda 2)
└── README.md
```

## 🔥 1. Configurar Firebase

1. Entra a https://console.firebase.google.com y crea un proyecto.
2. **Build → Firestore Database → Create database**. Elige una región cercana.
3. **Configuración del proyecto (⚙️) → Tus apps → icono Web `</>`** → registra la app → copia el objeto `firebaseConfig`.
4. Pégalo en `app.js`, en la constante `firebaseConfig` (al inicio del archivo).
5. **Authentication → Sign-in method → Email/Password → Enable.** Luego en la pestaña **Users → Add user** crea tu cuenta de administrador (correo y contraseña). **No** crees más usuarios.
6. En `app.js` cambia `ADMIN_EMAIL` por ese mismo correo.
7. En **Firestore → Reglas** pega esto (cambia el correo) y pulsa **Publicar**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.email == "TU_CORREO_ADMIN@gmail.com";
    }
    match /scores/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['name','program','score','hits','total','at'])
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 20
                    && request.resource.data.score is int
                    && request.resource.data.score >= 0 && request.resource.data.score <= 20000;
      allow update, delete: if isAdmin();
    }
    match /questions/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

> 🔒 Así **cualquiera puede jugar y guardar su puntaje**, pero **solo el administrador** (con su sesión iniciada) puede editar o borrar puntajes y preguntas. La protección real está en estas **reglas**, no en ocultar botones.
>
> ⚠️ Las reglas de prueba de Firestore expiran a los 30 días; las de arriba no expiran.
>
> La `apiKey` de Firebase para web **no es un secreto**: la seguridad la dan las reglas.

## 💻 2. Probarlo en tu computador (VS Code)

Los módulos de JavaScript **no funcionan abriendo el archivo con doble clic** (`file://`). Usa un servidor local:

1. En VS Code instala la extensión **Live Server** (Ritwick Dey).
2. Abre la carpeta del proyecto (**File → Open Folder**).
3. Clic derecho sobre `index.html` → **Open with Live Server**.
4. Se abre `http://127.0.0.1:5500`. Si cambias algo, recarga con `Ctrl + F5`.

## 🚀 3. Subir el proyecto a GitHub (paso a paso)

### 3.1 Preparación (una sola vez)

1. **Crea tu cuenta** en https://github.com.
2. **Instala Git**: https://git-scm.com/downloads (en Windows deja las opciones por defecto). Cierra y vuelve a abrir VS Code.
3. Abre la terminal de VS Code (`Ctrl + ñ`, o menú **Terminal → New Terminal**) y comprueba:

```bash
git --version
```

4. Dile a Git quién eres (usa el **mismo correo** de tu cuenta de GitHub):

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tucorreo@ejemplo.com"
```

### 3.2 Crear el repositorio en GitHub

1. En GitHub pulsa **+ → New repository**.
2. **Repository name:** `brasil-trivia`.
3. Elige **Public** (necesario para GitHub Pages gratis).
4. ⚠️ **No marques** "Add a README", ".gitignore" ni "license" (ya tienes tu README; si los marcas, el primer `push` dará conflicto).
5. Pulsa **Create repository**. Quedarás en una página con la URL, algo como `https://github.com/TU_USUARIO/brasil-trivia.git`. Cópiala.

### 3.3 Subir los archivos (opción A: terminal)

Dentro de la carpeta del proyecto, en la terminal de VS Code:

```bash
git init
git branch -M main
git add .
git commit -m "Primera versión de Brasil Trivia"
git remote add origin https://github.com/TU_USUARIO/brasil-trivia.git
git push -u origin main
```

Qué hace cada comando:

| Comando | Qué hace |
|---|---|
| `git init` | Convierte la carpeta en un repositorio de Git |
| `git branch -M main` | Nombra la rama principal `main` |
| `git add .` | Marca todos los archivos para guardarlos en la versión |
| `git commit -m "..."` | Guarda una versión (foto del proyecto) con un mensaje |
| `git remote add origin URL` | Conecta tu carpeta con el repositorio de GitHub |
| `git push -u origin main` | Sube la versión a GitHub |

**Inicio de sesión:** al hacer `push` se abre una ventana del navegador para autorizar a GitHub (Git Credential Manager). Inicia sesión y acepta. Si en cambio te pide usuario y contraseña, la "contraseña" debe ser un **token**:

1. GitHub → tu foto → **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token**.
2. Marca el permiso **repo**, genera y copia el token (solo se muestra una vez).
3. Úsalo como contraseña.

### 3.3 Subir los archivos (opción B: solo con la interfaz de VS Code)

1. Clic en el icono **Source Control** (barra izquierda) → **Initialize Repository**.
2. Escribe un mensaje (ej. `Primera versión`) y pulsa **Commit**. Si pregunta por "stage changes", elige **Yes/Always**.
3. Pulsa **Publish Branch**. VS Code te pide iniciar sesión en GitHub y permite crear el repositorio directamente (elígelo **Public**).

### 3.4 Publicar con GitHub Pages

1. En tu repositorio: **Settings → Pages**.
2. En **Build and deployment → Source**, elige **Deploy from a branch**.
3. **Branch:** `main` · carpeta `/ (root)` → **Save**.
4. Espera de 1 a 3 minutos y recarga. Aparecerá tu enlace:

```
https://TU_USUARIO.github.io/brasil-trivia/
```

Ese es el enlace que entregas como evidencia. Comprueba que el juego guarda un puntaje y que aparece en el ranking.

### 3.5 Subir cambios después (el día a día)

Cada vez que modifiques algo:

```bash
git add .
git commit -m "Describe lo que cambiaste"
git push
```

Pages se actualiza solo en 1–2 minutos (recarga con `Ctrl + F5`). En VS Code también puedes hacerlo con **Source Control → mensaje → Commit → Sync Changes**.

### 3.6 Trabajo con ramas y Pull Requests (Git Flow simplificado)

Útil para la parte de colaboración de la actividad:

```bash
git switch -c feature/nuevas-preguntas      # crea y entra a una rama nueva
# ...haces cambios...
git add .
git commit -m "Agrego 10 preguntas de historia"
git push -u origin feature/nuevas-preguntas
```

Luego en GitHub:

1. Aparece un botón **Compare & pull request** → pulsa y describe el cambio.
2. Revisa y pulsa **Merge pull request**.
3. En tu computador vuelve a la rama principal y actualízala:

```bash
git switch main
git pull
```

## 🧩 Agregar preguntas

**Desde el panel Admin** (recomendado): botón 🛠️ Admin → PIN → llena el formulario.
Las opciones van una por línea con el formato `English|Español|Português` (si es un nombre propio basta escribirlo una vez). En "Wikipedia article" pon el título del artículo en inglés para que la foto aparezca sola (ej. `Pelé`, `Iguazu Falls`).

**Desde el código:** copia una línea de `questions2.js`:

```js
{d:"easy",e:"🏛️",w:"Brasília",c:"geo",q:"…",es:"…",pt:"…",o:["A|…|…","B","C","D"],a:0,x:["feedback EN","feedback ES","feedback PT"]}
```

`d` = nivel (`easy`, `medium`, `hard`) · `c` = tema (`geo`, `culture`, `sports`, `history`) · `a` = posición de la correcta (empieza en 0).

## 🛠️ Solución de problemas

| Problema | Causa y solución |
|---|---|
| Pantalla en blanco o error de módulos en la consola | Abriste el `index.html` con doble clic. Usa Live Server o tu enlace de GitHub Pages. |
| `git: command not found` | Git no está instalado o no reiniciaste VS Code. |
| `fatal: not a git repository` | No ejecutaste `git init` o estás en otra carpeta. |
| `failed to push some refs` | Creaste el repo con README. Ejecuta `git pull origin main --allow-unrelated-histories`, resuelve si pide y haz `git push` otra vez. |
| `remote origin already exists` | Usa `git remote set-url origin URL_CORRECTA`. |
| Pages muestra 404 | Revisa que `index.html` esté en la raíz (no dentro de otra carpeta), que el repo sea público y que hayas activado Pages en `main`. Espera unos minutos. |
| Subí un cambio y no se ve | Espera 1–2 min y recarga con `Ctrl + F5`. |
| El ranking no carga / `permission-denied` | Revisa las reglas de Firestore (¿expiró el modo de prueba?) y que `firebaseConfig` esté completo. |
| No salen las fotos | Revisa el título de Wikipedia en `w` y tu conexión a internet; si no hay foto, se muestra el emoji. |
| No suena la voz | Prueba Chrome o Edge y revisa que haya voces instaladas para español y portugués. |

## 🎓 Puntos para la defensa técnica

- **Serverless:** no hay servidor propio; el navegador habla directo con Firestore usando el SDK.
- **NoSQL vs relacional:** Firestore guarda *documentos* dentro de *colecciones* (`scores`, `questions`) sin esquema fijo ni `JOIN`; ideal para datos que cambian rápido.
- **Tiempo real:** `onSnapshot` mantiene el ranking y las preguntas sincronizados en todos los navegadores abiertos, sin recargar.
- **Seguridad:** la `apiKey` es pública; lo que protege los datos son las **reglas de Firestore**. Mejora pendiente: Firebase Authentication.
- **Colaboración:** control de versiones con Git, ramas y Pull Requests; despliegue continuo con GitHub Pages.

## 🙌 Créditos

Imágenes: Wikipedia / Wikimedia Commons. Fuentes: Google Fonts (Fraunces, Inter).