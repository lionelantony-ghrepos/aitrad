# Codespaces (Path A)

Devcontainer for GitHub Codespaces: **Node 22** (`javascript-node:22-bookworm`), pnpm 9.15.9, **Docker-in-Docker** so `npx @insforge/cli local start` can run Compose inside the codespace. Repo `engines.node` may still be `>=20.11` for local/WSL; Codespaces needs 22 because current pnpm loads `node:sqlite`.

Standup checklist (secrets, migrate, seed, Next, stop): **[docs/codespaces-path-a.md](../docs/codespaces-path-a.md)**.

Hooks stay minimal (`post-create.sh` enables pnpm and checks Docker). Install and seed are manual.
