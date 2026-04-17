#!/usr/bin/env bash

function run_amule() {
    while true; do
        (set_amule_options)
        bash /home/amule/entrypoint.sh
    done
}

function choose_emulerr_user() {
    # 1. wait up to 15s for the "amule" user to be ready (created by a parallel script)
    local waited=0
    while ! id amule &>/dev/null && [ $waited -lt 15 ]; do
        sleep 1
        waited=$((waited + 1))
    done
    if id amule &>/dev/null; then
        echo "amule"
        return 0
    fi

    # 2. otherwise try using the user with UID=$PUID
    if [ -n "$PUID" ] && getent passwd "$PUID" >/dev/null 2>&1; then
        getent passwd "$PUID" | cut -d: -f1
        return 0
    fi

    # 3. otherwise try "nobody"
    if id nobody &>/dev/null; then
        echo "nobody"
        return 0
    fi

    # 4. last resort: root
    echo "root"
    return 0
}

function run_emulerr() {
    local EMULERR_USER
    EMULERR_USER=$(choose_emulerr_user)

    if [ -d /emulerr-dev ]; then
        cd /emulerr-dev
        npm ci --production=false
        env NODE_ENV=development npm run dev
    else
        chown -R "$EMULERR_USER":"${PGID:-$EMULERR_USER}" /emulerr 2>/dev/null || true
        cd /emulerr
        while true; do
            su "$EMULERR_USER" -s /bin/sh <<'EOF'
env NODE_ENV=production npm run start
EOF
        done
    fi
}

function set_amule_options() {
    mkdir -p /config/amule
    cp /config-base/amule/amule.conf /config/amule/amule.conf
    touch /config/amule/amule.overrides.conf
    python3 - <<'EOF'
import configparser

config_path = "/config/amule/amule.conf"
overrides_path = "/config/amule/amule.overrides.conf"

class NoSpaceConfigParser(configparser.ConfigParser):
    def write(self, fp, space_around_delimiters=False):
        super().write(fp, space_around_delimiters=space_around_delimiters)

config = NoSpaceConfigParser(interpolation=None)
config.optionxform = str
config.read(config_path) 

override = NoSpaceConfigParser(interpolation=None)
override.optionxform = str
override.read(overrides_path) 

for section in override.sections():
    if not config.has_section(section):
        config.add_section(section)
    for key, value in override.items(section):
        config.set(section, key, value)

with open(config_path, "w") as f:
    config.write(f, space_around_delimiters=False)
EOF
    sed -i "s/Port=4662/Port=$ED2K_PORT/g" /config/amule/amule.conf
    sed -i "s/UDPPort=4672/UDPPort=$ED2K_PORT/g" /config/amule/amule.conf
    echo $'/tmp/shared\n/downloads/complete'| cat>| /config/amule/shareddir.dat
    rm -f /config/amule/muleLock
    rm -f /config/amule/ipfilter* # remove when bug is fixed
    chown -R "${PUID}:${PGID}" /home/amule/.aMule
    chown -R "${PUID}:${PGID}" /config
    chown -R "${PUID}:${PGID}" /downloads
    mkdir -p /downloads/complete
}

(run_amule) &
(run_emulerr) &

wait
