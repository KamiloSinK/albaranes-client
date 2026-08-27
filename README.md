# coa-frontend

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and
disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for
type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the
TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

## GitHub Copilot en VS Code

Este proyecto recomienda VS Code como entorno de desarrollo. Si utilizas **GitHub Copilot** y no ves los modelos de Claude disponibles, ten en cuenta lo siguiente:

### ¿Por qué no aparece Claude con Copilot Pro?

Tener una suscripción **GitHub Copilot Pro** no garantiza acceso inmediato a todos los modelos de lenguaje disponibles (como Claude de Anthropic). La disponibilidad depende de varios factores:

- **Despliegue gradual**: GitHub activa modelos de forma progresiva; puede que tu cuenta aún no los tenga habilitados.
- **Versión del cliente**: asegúrate de tener la versión más reciente de VS Code y de las extensiones **GitHub Copilot** y **GitHub Copilot Chat**.
- **Cuenta autenticada**: verifica que VS Code esté autenticado con la misma cuenta GitHub que tiene la suscripción Pro activa.
- **Entorno administrado**: si usas una cuenta de organización o empresa, un administrador puede haber restringido qué modelos están disponibles.
- **Región**: la disponibilidad de ciertos modelos puede variar según el país.

### Pasos para comprobar la disponibilidad

1. Abre Copilot Chat en VS Code y busca el selector de modelos en la parte superior del panel.
2. Si Claude no aparece en la lista, actualiza VS Code y las extensiones Copilot a la última versión.
3. Cierra sesión en GitHub desde VS Code y vuelve a autenticarte.
4. Si el problema persiste, consulta la [documentación oficial de GitHub Copilot](https://docs.github.com/es/copilot/using-github-copilot/ai-models/changing-the-ai-model-for-copilot-chat) para ver qué modelos están disponibles en tu plan.
