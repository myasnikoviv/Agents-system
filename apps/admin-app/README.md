# Admin App

System-level admin surface extracted as a dedicated frontend deploy unit for Sprint 35.5B.

## Local run

```bash
npm run start:admin
```

Default URL: `http://127.0.0.1:3001`

## Notes

- This app owns `/admin/*` routes.
- `client-app` redirects `/admin/*` to `VITE_ADMIN_URL` (defaults to `http://127.0.0.1:3001`).
