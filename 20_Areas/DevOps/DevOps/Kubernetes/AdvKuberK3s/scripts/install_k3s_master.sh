#!/bin/bash
set -e

apt-get update && apt-get install -y curl ethtool vim

ethtool -K eth1 tx off || true

curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="\
--disable=traefik \
--node-ip=192.168.56.10 \
--advertise-address=192.168.56.10 \
--flannel-iface=eth1 \
" sh -

while [ ! -f /var/lib/rancher/k3s/server/node-token ]; do
  sleep 2
done

sudo cat /var/lib/rancher/k3s/server/node-token > /vagrant/node_token.txt
