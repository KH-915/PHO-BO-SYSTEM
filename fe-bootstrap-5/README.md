SimpleFacebook (FE - Bootstrap 5)

Quick start

1. From `fe-bootstrap-5` folder install dependencies:

```powershell
npm install
```

2. Start dev server:

```powershell
npm run dev
```

Notes

- Vite proxies `/api` to `http://localhost:8000` (edit `vite.config.js` if backend runs elsewhere).
- Axios uses `withCredentials: true` so backend should set auth cookie on login.
- Implemented: Auth context, Login/Register pages, Feed with composer and post list, and Axios services (`authService`, `postService`).

Next steps

- Add media upload, reactions, comments components.
- Improve error handling and form validation.
