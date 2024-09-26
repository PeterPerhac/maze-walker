#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURRENT_DIR="$(pwd)"

if [[ "$CURRENT_DIR" != "$SCRIPT_DIR" ]]; then
    echo "This script must be run from its own directory: $SCRIPT_DIR"
    exit 1
fi


rm -f maze-walker.zip
echo 'devMode = false;' > devmode.js
zip -r maze-walker.zip maze-walker.html devmode.js img mazes sfx -x "*.DS_Store"
rm -f devmode.js
scp maze-walker.zip opc@devpro:/home/opc
ssh opc@devpro "sudo ./cleanup-and-unzip-maze-walker.sh"

