#!/bin/bash
set -e

apt-get update && apt-get install -y curl ethtool

ethtool -K eth1 tx off || true

while [ ! -f /vagrant/node_token.txt ]; do
  echo "Waiting for master token..."
  sleep 5
done

TOKEN=$(cat /vagrant/node_token.txt)
NODE_IP=$(ip -4 addr show eth1 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')

curl -sfL https://get.k3s.io | \
  K3S_URL=https://192.168.56.10:6443 \
  K3S_TOKEN=$TOKEN \
  INSTALL_K3S_EXEC="--node-ip=${NODE_IP} --flannel-iface=eth1" \
  sh -
