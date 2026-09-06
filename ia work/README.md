# Lista de plantas

Aplicación web móvil para organizar plantas por invernadero.

## Uso local

Abre `index.html` en el navegador. La lista se guarda en el almacenamiento local del dispositivo.

## Compartir entre móviles

Para tener una lista común, ejecuta el servidor incluido:

```text
npm start
```

Después publica este proyecto en un servicio que pueda ejecutar Node.js y reparte la URL pública. Todos los móviles usarán `/api/entries`, que guarda los datos en `entries.json` y sincroniza cada cinco segundos.

También se puede indicar un endpoint externo mediante el parámetro `sync`:

```text
https://tu-dominio/index.html?sync=https%3A%2F%2Ftu-servidor%2Fentries.json
```

El endpoint debe responder a `GET` y aceptar `PUT` con un array JSON de entradas.
