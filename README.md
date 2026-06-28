# aMulerr

[![Latest Release](https://img.shields.io/github/v/release/isc30/amulerr)](https://github.com/isc30/amulerr/releases/latest)

Integrate your *rr apps with aMule (eD2k/KAD). Compatible with:

- Radarr
- Sonarr

> aMulerr is the successor of eMulerr, which no longer exists. If you want a full UI for amule, try [AmuTorrent](https://github.com/got3nks/amutorrent)

## Example `docker-compose.yaml`

> Note: aMulerr connects to aMule, you should run it in a separate container

```yaml
services:
  amulerr:
    container_name: amulerr
    image: isc30/amulerr:latest
    user: "1000:1000" # optional
    environment:
      - AMULE_HOST=amule
      - AMULE_PORT=4712
      - AMULE_PWD=api-secret # API Password
      - ALLOWED_CATEGORIES=tv-sonarr-aMulerr,radarr-aMulerr # Optional: Filter categories to prevent contamination
    ports:
      - "3000:3000" # API
  amule:
    container_name: amule
    image: ngosang/amule:latest
    environment:
      - PUID=1000
      - PGID=1000
      - GUI_PWD=api-secret # API Password
      - WEBUI_PWD=web-secret
      - MOD_AUTO_RESTART_ENABLED=true
      - MOD_AUTO_RESTART_CRON=0 6 * * *
    ports:
      - "4711:4711" # Web interface (amuleweb)
      - "4712:4712" # External connections (amulerr)
      - "4662:4662" # ED2K client-to-client TCP (required for High ID)
      - "4665:4665/udp" # ED2K server UDP (global searches, TCP port +3)
      - "4672:4672/udp" # Extended eMule protocol and Kademlia UDP
    volumes:
      - downloads:/downloads
      - amule_data:/home/amule/.aMule
volumes:
  downloads:
  amule_data:
```

## Environment Variables

| Variable | Description |
| --- | --- |
| `AMULE_HOST` | Hostname of the aMule container. |
| `AMULE_PORT` | Port for External Connections (default: `4712`). |
| `AMULE_PWD` | Password for External Connections (GUI_PWD in aMule). |
| `ALLOWED_CATEGORIES` | Comma-separated list of categories allowed to be created/modified in aMule (e.g. `tv-sonarr,radarr,tv-4k`). **Use this if you run multiple instances of Sonarr/Radarr.** |
| `SONARR_CATEGORY` | Single category name allowed for Sonarr (e.g. `tv-sonarr-aMulerr`). *Note: Only supports a single value.* |
| `RADARR_CATEGORY` | Single category name allowed for Radarr (e.g. `radarr-aMulerr`). *Note: Only supports a single value.* |

## Configuring *rr

In order to get started, configure the Download Client in *RR:

- Type: `qBittorrent`
- Name: `aMulerr`
- Host: `amulerr`
- Port: `3000`
- Priority: `50`

Also set the Download Client's `Remote Path Mappings`:

- Host: `amulerr`
- Remote Path: `/downloads`
- Local Path: `{The /downloads folder inside MOUNTED PATH FOR RADARR}`

Then, add a new Indexer in *RR:

- Type: `Torznab`
- Name: `aMulerr`
- RSS: `No`
- Automatic Search: `No`
- Interactive Search: `Yes`
- URL: `http://amulerr:3000/`
- Download Client: `aMulerr`

## Removing stale downloads

Since aMulerr simulates a qBittorrent api, it is fully compatible with:
- [Decluttarrr](https://github.com/ManiMatter/decluttarr)
- [aMulerrStalledChecker](https://github.com/Jorman/aMulerrStalledChecker)

## Troubleshooting

### Container crashes when sharing too many files

If you have a large number of files in your `downloads/complete` directory, aMule may crash when trying to load all shared files at startup. This is a known limitation of aMule itself when handling a high volume of shared files.

**Symptoms:**
- Container keeps restarting in a crash loop
- Logs show `FetchError: Invalid response body` or `ECONNRESET` errors when fetching `api.php?get=downloads`
- Files are only partially visible in the web UI before it becomes unavailable

**Workaround:**

Disable the automatic file sharing feature by setting `MOD_AUTO_SHARE_ENABLED=false` in your docker-compose environment:

```yml
environment:
  - MOD_AUTO_SHARE_ENABLED=false
```
