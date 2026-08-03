# Guía de instalación en PC nuevo — Dulce Paladar

## 1. Programas a instalar (en orden)

### Node.js
- Descargar desde: https://nodejs.org
- Instalar versión LTS (actualmente v22 o superior)
- Verificar: abrir terminal y escribir `node --version` y `npm --version`

### Git
- Descargar desde: https://git-scm.com
- Durante instalación, dejar opciones por defecto

### VS Code (editor de código)
- Descargar desde: https://code.visualstudio.com
- Extensiones recomendadas: ESLint, Tailwind CSS IntelliSense, Prettier

### Claude Code (agente IA)
- Instalar desde: https://claude.ai/code

---

## 2. Clonar el proyecto desde GitHub

Abrir terminal (CMD o PowerShell) y ejecutar:

```bash
git clone https://github.com/luisabecerra22/Dulce-Paladar.git
cd Dulce-Paladar
npm install
```

---

## 3. Crear el archivo .env.local (CRÍTICO)

Este archivo NO está en GitHub por seguridad. Debes crearlo manualmente.

Crea un archivo llamado `.env.local` en la raíz del proyecto con este contenido
(llena los valores con los datos de Supabase y servicios):

```
NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[tu-service-role-key]
NEXT_PUBLIC_APP_URL=http://localhost:3000
BOT_API_KEY=[tu-bot-api-key]
NEXT_PUBLIC_VAPID_PUBLIC_KEY=[tu-vapid-public]
VAPID_PRIVATE_KEY=[tu-vapid-private]
VAPID_EMAIL=luisabecerra22@gmail.com
ANTHROPIC_API_KEY=[tu-anthropic-key]
WHATSAPP_ACCESS_TOKEN=[token-whatsapp]
WHATSAPP_PHONE_NUMBER_ID=[id-numero-whatsapp]
WHATSAPP_VERIFY_TOKEN=[tu-verify-token]
NUMERO_PERSONAL_DUENA=[numero-duena]
META_PAGE_ACCESS_TOKEN=[token-pagina-meta]
INSTAGRAM_ACCOUNT_ID=[id-instagram]
```

**¿Dónde encuentro las claves de Supabase?**
- Ir a https://supabase.com → tu proyecto → Settings → API
- Copiar "Project URL" y "anon public key"

---

## 4. Correr el proyecto localmente

```bash
npm run dev
```

Abrir en el navegador: http://localhost:3000

---

## 5. Verificar que todo funciona

- [ ] La página de login carga
- [ ] Puedes iniciar sesión con tu cuenta admin
- [ ] El dashboard muestra datos
- [ ] El menú público `/menu` carga sin login

---

## Datos importantes del proyecto

| Item | Valor |
|------|-------|
| URL producción | https://dulce-paladar-six.vercel.app |
| Repositorio | https://github.com/luisabecerra22/Dulce-Paladar |
| Supabase | https://supabase.com (cuenta luisabecerra22@gmail.com) |
| Vercel | https://vercel.com (cuenta luisabecerra22@gmail.com) |
| Node requerido | v22+ |

---

## Si algo no funciona

1. Verificar que el `.env.local` existe y tiene todos los valores
2. Borrar la carpeta `node_modules` y correr `npm install` de nuevo
3. Verificar versión de Node: `node --version` (debe ser v22+)
4. Abrir Claude Code y describir el error
