# Lista de plantas

Aplicación web móvil para organizar plantas por invernadero.

## Uso local

Abre `index.html` en el navegador. La lista se guarda en el almacenamiento local del dispositivo.

## Compartir entre móviles

Para tener una lista común, ejecuta el servidor incluido:

```text
npm start
```

Después publica este proyecto en Vercel y añade una integración de Postgres desde la sección **Storage** del proyecto. La función `api/entries.js` crea la tabla `plant_entries` automáticamente y todos los móviles usarán `/api/entries`, sincronizando cada cinco segundos.

En Vercel configura **Framework Preset** como `Other`, deja vacío **Build Command** y usa `npm install` como **Install Command**. Tras conectar Postgres, haz un nuevo deploy.

También se puede indicar un endpoint externo mediante el parámetro `sync`:

```text
https://tu-dominio/index.html?sync=https%3A%2F%2Ftu-servidor%2Fentries.json
```

El endpoint debe responder a `GET` y aceptar `PUT` con un array JSON de entradas.
