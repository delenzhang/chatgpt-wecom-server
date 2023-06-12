#!/bin/bash
docker stop chatgpt-wecom-server && docker rm chatgpt-wecom-server
docker rmi chatgpt-wecom-server:latest
docker rmi chatgpt-wecom-server:1.0.2
docker-compose up -d