-
```bash
wget -q --show-progress --https-only --timestamping -P downloads -i downloads-$(dpkg --print-architecture).txt
```

- Раскидываем по папкам для удобаства

```bash
{ ARCH=$(dpkg --print-architecture); mkdir -p downloads/{client,cni-plugins,controller,worker}; tar -xvf downloads/crictl-v1.32.0-linux-amd64.tar.gz -C downloads/worker/; tar -xvf downloads/containerd-2.1.0-beta.0-linux-amd64.tar.gz --strip-components 1 -C downloads/worker/; tar -xvf downloads/cni-plugins-linux-amd64-v1.6.2.tgz -C downloads/cni-plugins/; tar -xvf downloads/etcd-v3.6.0-rc.3-linux-amd64.tar.gz -C downloads --strip-components 1 etcd-v3.6.0-rc.3-linux-amd64/etcdctl etcd-v3.6.0-rc.3-linux-amd64/etcd; mv downloads/{etcdctl,kubectl} downloads/client/; mv downloads/{etcd,kube-apiserver,kube-controller-manager,kube-scheduler} downloads/controller/; mv downloads/{kubelet,kube-proxy} downloads/worker/; mv downloads/runc.${ARCH} downloads/worker/runc; }
```

```bash
chmod +x downloads/{client,cni-plugins,controller,worker}/*
```

```bash
openssl genrsa -out ca.key 4096
openssl req -x509 -new -sha512 -noenc \
-key ca.key -days 3653 \
-config ca.conf \
-out ca.crt
```