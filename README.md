# aMulerr

Integrate your *rr apps with aMule (eD2k/KAD). Compatible with:

- Radarr
- Sonarr

https://hub.docker.com/r/isc30/amulerr

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
