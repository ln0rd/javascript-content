#!/bin/bash

WORKLOAD=$1
if [ ! -n "$WORKLOAD" ]; then
    echo "Missing argument. Run as $0 app01,app02"
    exit 0
fi

for w in $(echo $WORKLOAD | tr "," "\n"); do
    if [[ -f deploy/$w ]]; then
        echo "revision=$(openssl rand -hex 3)" > deploy/$w
    else
        echo "Workload deploy/$w doesn't exists"
        continue
    fi
done
