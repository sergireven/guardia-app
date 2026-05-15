# 🏥 GuàrdiesApp — HCV Cirurgia

Aplicació web per gestionar guardies de cap de setmana i vacances del servei de Cirurgia.

**Stack:** Next.js 15 · TypeScript · Prisma · PostgreSQL (Neon) · NextAuth.js · Vercel

---

## 🚀 Posada en marxa (pas a pas)

### Pas 1 — Requisits previs
- [Node.js 20+](https://nodejs.org)
- [Git](https://git-scm.com)
- Compte a [GitHub](https://github.com)
- Compte a [Vercel](https://vercel.com) (gratis)
- Compte a [Neon](https://neon.tech) (gratis)

---

### Pas 2 — Crear la base de dades a Neon

1. Entra a [console.neon.tech](https://console.neon.tech)
2. Crea un nou projecte → nom: `guardia-app`
3. A la pàgina del projecte, copia la **Connection string** (format: `postgresql://...`)
4. Guarda-la, la necessitaràs al Pas 4

---

### Pas 3 — Clonar i instal·lar dependències

```bash
# Clona el repositori (o copia els fitxers a una carpeta)
cd guardia-app

# Instal·la dependències
npm install
```

---

### Pas 4 — Configurar variables d'entorn

```bash
# Copia el fitxer d'exemple
cp .env.example .env.local
```

Edita `.env.local` amb els teus valors:

```env
DATABASE_URL="postgresql://...@...neon.tech/neondb?sslmode=require"
AUTH_SECRET="genera-un-secret-amb: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

Per generar el secret (executa a la terminal):
```bash
openssl rand -base64 32
```

---

### Pas 5 — Crear les taules i carregar les dades inicials

```bash
# Crea les taules a la base de dades
npm run db:push

# Carrega les dades inicials (usuaris, guardies, festius, posicions)
npm run db:seed
```

Després del seed, els usuaris creats són:

| Nom | Email | Contrasenya |
|-----|-------|-------------|
| Neus Plaza | neus.plaza@hcv.cat | HCV2026 |
| Berta Gauthier | berta.gauthier@hcv.cat | HCV2026 |
| Montse Prieto | montse.prieto@hcv.cat | HCV2026 |
| Judith Hernandez | judith.hernandez@hcv.cat | HCV2026 |
| Ana Otero | ana.otero@hcv.cat | HCV2026 |
| Andrea | andrea@hcv.cat | HCV2026 |
| Geoconda | geoconda@hcv.cat | HCV2026 |
| Paula | paula@hcv.cat | HCV2026 |
| Marta P | marta.p@hcv.cat | HCV2026 |
| Sofia | sofia@hcv.cat | HCV2026 |

> ⚠️ Cada usuari pot canviar la seva contrasenya des del botó "Contrasenya" a la barra lateral.

---

### Pas 6 — Provar en local

```bash
npm run dev
```

Obre [http://localhost:3000](http://localhost:3000) → hauries de veure la pàgina de login.

---

### Pas 7 — Publicar a Vercel

#### Opció A — Des de la web de Vercel (recomanat per primera vegada)

1. Puja el codi a GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/el-teu-usuari/guardia-app.git
   git push -u origin main
   ```

2. Entra a [vercel.com](https://vercel.com) → "New Project"
3. Connecta el repositori de GitHub
4. A **Environment Variables**, afegeix:
   - `DATABASE_URL` → la teva connection string de Neon
   - `AUTH_SECRET` → el secret generat
   - `NEXTAUTH_URL` → `https://el-teu-projecte.vercel.app` (l'URL que et doni Vercel)
5. Clica **Deploy**

#### Opció B — Via CLI

```bash
npm install -g vercel
vercel
# Segueix les instruccions i afegeix les variables d'entorn quan ho demani
```

---

## 📁 Estructura del projecte

```
guardia-app/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth endpoints
│   │   ├── change-password/       # Canvi de contrasenya
│   │   ├── guardias/              # CRUD guardies
│   │   ├── holidays/              # CRUD festius
│   │   ├── positions/             # Assignació posicions
│   │   ├── requests/              # CRUD sol·licituds
│   │   ├── users/                 # CRUD usuaris
│   │   └── vacations/             # CRUD vacances
│   ├── dashboard/                 # Pàgina principal (protegida)
│   ├── login/                     # Pàgina de login
│   ├── layout.tsx                 # Layout arrel
│   └── page.tsx                   # Redirecció inicial
├── components/
│   └── GuardiaApp.tsx             # Component principal de l'app
├── lib/
│   ├── auth.ts                    # Configuració NextAuth
│   └── db.ts                      # Connexió Prisma + Neon
├── prisma/
│   ├── schema.prisma              # Model de base de dades
│   └── seed.ts                    # Dades inicials
├── middleware.ts                  # Protecció de rutes
├── .env.example                   # Variables d'entorn (plantilla)
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 🔐 Rols i permisos

| Acció | Admin | Auxiliar |
|-------|-------|---------|
| Veure calendari | ✅ | ✅ |
| Editar guàrdies/vacances directament | ✅ | ❌ |
| Sol·licitar canvis | ✅ | ✅ |
| Aprovar/rebutjar sol·licituds | ✅ | ❌ |
| Gestionar usuaris | ✅ | ❌ |
| Gestionar festius | ✅ | ❌ |
| Canviar la pròpia contrasenya | ✅ | ✅ |

---

## 🔮 Pròxims passos opcionals

- [ ] Login amb Microsoft 365 (SSO) via Azure AD
- [ ] Notificacions per email quan s'aprova/rebutja una sol·licitud
- [ ] Exportació a PDF i Excel
- [ ] App mòbil (PWA)

---

## 🆘 Problemes comuns

**Error de connexió a la BD:**
- Comprova que `DATABASE_URL` és correcta i inclou `?sslmode=require`
- Neon desactiva la base de dades si no s'usa. Entra al panell de Neon i activa-la.

**Error "AUTH_SECRET not set":**
- Assegura't que `AUTH_SECRET` existeix a `.env.local` o a les variables de Vercel.

**Pàgina en blanc després del deploy:**
- Revisa els logs a Vercel → Functions tab per veure l'error concret.
