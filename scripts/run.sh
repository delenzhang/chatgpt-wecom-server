#!/bin/bash

pkgVersion=$(grep -oE '"version":\s*"[^"]+' -m 1 ./package.json | grep -oE '[^"]+$')
pkgName=$(grep -oE '"name":\s*"[^"]+' -m 1 ./package.json | grep -oE '[^"]+$')
docker stop chatgpt-wecom-server && docker rm chatgpt-wecom-server
docker-compose up -d
docker rmi $pkgName:latest