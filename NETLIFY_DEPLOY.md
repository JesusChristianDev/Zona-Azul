# Guía de Deploy en Netlify

## Configuración Requerida

### Variables de Entorno en Netlify

Asegúrate de configurar las siguientes variables de entorno en Netlify:

**En Netlify Dashboard:**
1. Ve a **Site settings** > **Build & deploy** > **Environment**
2. Agrega las siguientes variables:

#### Variables Requeridas:

- `NEXT_PUBLIC_SUPABASE_URL` - URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clave anónima de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clave de servicio de Supabase (para operaciones administrativas)
- `NEXT_PUBLIC_APP_URL` - URL de producción: `https://zonazul.netlify.app`

#### Variables Opcionales (para Google Calendar):

- `GOOGLE_CLIENT_ID` - ID de cliente de Google OAuth
- `GOOGLE_CLIENT_SECRET` - Secreto de cliente de Google OAuth
- `GOOGLE_REDIRECT_URI` - URI de redirección (se auto-detecta si no se especifica)

### Verificar Build Localmente

Antes de hacer deploy, verifica que el build funciona localmente:

```bash
npm ci
npm run build
```

Si el build falla localmente, el mismo error aparecerá en Netlify.

### Solución de Problemas

1. **Si el build falla por variables de entorno faltantes:**
   - Asegúrate de que todas las variables estén configuradas en Netlify
   - Las variables `NEXT_PUBLIC_*` son necesarias para el build

2. **Si el build funciona localmente pero falla en Netlify:**
   - Limpia el cache en Netlify: **Deploys** > **Trigger deploy** > **Clear cache and deploy site**
   - Verifica que el plugin `@netlify/plugin-nextjs` esté instalado (ya está en devDependencies)

3. **Si ves errores de timeout:**
   - El build puede tardar varios minutos, especialmente la primera vez
   - Netlify tiene un timeout de 15 minutos por defecto

### Configuración Actual

- **Node Version:** 20 (configurado en `.nvmrc` y `netlify.toml`)
- **Build Command:** `npm run build`
- **Plugin:** `@netlify/plugin-nextjs` (maneja automáticamente el output)

### Archivos Importantes

- `netlify.toml` - Configuración de Netlify
- `.nvmrc` - Versión de Node
- `package.json` - Dependencias y scripts
- `next.config.js` - Configuración de Next.js

