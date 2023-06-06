#!/bin/bash
docker stop chatgpt-wecom-server && docker rm chatgpt-wecom-server
docker-compose up -d