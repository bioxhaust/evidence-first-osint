# Production deployment

The repository is public at [bioxhaust/evidence-first-osint](https://github.com/bioxhaust/evidence-first-osint).
GitHub Pages serves the course at [the project URL](https://bioxhaust.github.io/evidence-first-osint/).
The dedicated server mount is [https://16.16.176.247/osint/](https://16.16.176.247/osint/).

Only built static files are published. Python tool launchers, virtual environments, SSH keys and development servers are not deployed as executable services. Authentication/cloud progress remain disabled until separately configured and tested; investigator notes stay in the learner's browser.

## Build and validate

Use the checked-out commit with a clean worktree. Install `requirements-dev.txt` into a local virtual environment, then run:

```sh
python -m unittest discover -s tests -v
node --test tests/*.test.mjs
python tools/build_site.py
python tools/check_project.py
python tools/build_site.py --site-url https://16.16.176.247/osint/ --output scratch/site-server
python tools/check_project.py --site scratch/site-server --site-url https://16.16.176.247/osint/
```

Separate builds are required because MkDocs generates deployment-specific absolute links on its 404 page. Each build includes `version.json` with the commit, dirty-worktree flag and configured URL. GitHub Actions runs the Pages build and deployment after a push to `main`.

## Server layout and release switch

- `/srv/evidence-first-osint/releases/<commit>/` — immutable unpacked static build.
- `/srv/evidence-first-osint/www/osint` — symlink to the active release.
- `/etc/nginx/snippets/evidence-first-osint.conf` — copy of [nginx-osint.conf](nginx-osint.conf), included in the existing HTTPS server block.

Upload to a new release directory, verify the uploaded archive hash and `version.json`, then replace the active symlink by a same-directory rename. Nginx configuration is tested with `nginx -t` before a reload. Preserve a backup of the previous configuration and the previous symlink target. Do not change the existing application at `/`, its TLS setup or unrelated services.

For rollback, create a temporary symlink to the previous release and rename it over `www/osint`; this switches the static files without restarting other applications. Do not remove the previous release until the new one has been verified.

Verify `/osint/`, `/osint/investigator/`, `/osint/trainer/`, source documents, static assets, `/osint/version.json`, missing-page status and trailing-slash redirects using HTTPS with certificate validation enabled. Also verify that the pre-existing root application still responds.
